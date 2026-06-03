#!/usr/bin/env python3
"""
灌入 RAG 语料:scripts/corpus_chunks.jsonl  ->  documents + resource_chunks

配置(已按你的库探查确定):
  owner_id   = admin (zhenhaite@gmail.com)
  visibility = 'global'   # match_chunks 用它判定"所有学生可检索"
  layer      = 1
  embed      = text-embedding-3-small (DMXAPI, 1536 维)

凭证:
  - Supabase 管理 token:自动从 ../.mcp.json 读取
  - 嵌入 key:优先用环境变量 DMXAPI_API_KEY;否则自动从 ai_api_configs 取 admin 的 dmxapi/openai key

特性:幂等(按 source_title 跳过已灌入的文档),可中断重跑。
用法:  python3 scripts/ingest_corpus.py
成本:  ~17k 块 × text-embedding-3-small ≈ $0.3
"""
import json, urllib.request, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, ".mcp.json")))
_a = cfg["mcpServers"]["supabase"]["args"]
TOKEN = _a[_a.index("--access-token") + 1]
REF   = _a[_a.index("--project-ref") + 1]
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

OWNER_ID    = "e941d693-a7b4-446b-9018-6b446f522c3f"   # admin
VISIBILITY  = "global"
LAYER       = 1
EMBED_MODEL = "text-embedding-3-small"
EMBED_URL   = "https://www.dmxapi.cn/v1/embeddings"
CHUNKS_FILE = os.path.join(ROOT, "scripts", "corpus_chunks.jsonl")
CHUNK_BATCH = 10     # 每条 INSERT 的块数(控制 payload 大小)

def sql(query, tries=8):
    for t in range(tries):
        req = urllib.request.Request(
            f"https://api.supabase.com/v1/projects/{REF}/database/query",
            data=json.dumps({"query": query}).encode(),
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": UA},
            method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (544, 540, 522, 503) and t < tries - 1:
                time.sleep(5); continue
            raise RuntimeError(f"SQL {e.code}: {e.read().decode()[:200]}")
        except Exception:
            if t < tries - 1:
                time.sleep(5); continue
            raise

def esc(s):  # 单引号转义
    return str(s).replace("'", "''")

# ---- 解析嵌入 key ----
EMBED_KEY = os.environ.get("DMXAPI_API_KEY")
if not EMBED_KEY:
    r = sql("select api_key from public.ai_api_configs where provider in ('dmxapi','openai') and is_active=true and api_key is not null limit 1;")
    if r:
        EMBED_KEY = r[0]["api_key"]
if not EMBED_KEY:
    sys.exit("❌ 没找到嵌入用的 DMXAPI/OpenAI key。请先 `export DMXAPI_API_KEY=你的key` 再重跑。")

def embed(texts, tries=6):
    out = []
    for i in range(0, len(texts), 20):
        batch = texts[i:i + 20]
        for t in range(tries):
            try:
                req = urllib.request.Request(EMBED_URL,
                    data=json.dumps({"model": EMBED_MODEL, "input": batch}).encode(),
                    headers={"Authorization": f"Bearer {EMBED_KEY}", "Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(req, timeout=120) as r:
                    d = json.load(r)
                out += [x["embedding"] for x in d["data"]]
                break
            except Exception as e:
                if t < tries - 1:
                    time.sleep(5); continue
                raise RuntimeError(f"embedding 失败: {e}")
    return out

# ---- 载入分块(按文档聚合)----
docs = {}
for line in open(CHUNKS_FILE):
    r = json.loads(line)
    docs.setdefault(r["doc_key"], []).append(r)
total_chunks = sum(len(v) for v in docs.values())
print(f"待灌:{len(docs)} 篇 / {total_chunks} 块")

# ---- 先清掉上次中断的半成品文档(chunk 数与记录不匹配),防止重复/残缺 ----
sql(f"""delete from public.resource_chunks where document_id in (
  select d.id from public.documents d
  where d.owner_id='{OWNER_ID}' and d.visibility='{VISIBILITY}'
    and d.chunk_count <> (select count(*) from public.resource_chunks rc where rc.document_id=d.id));""")
sql(f"""delete from public.documents d
  where d.owner_id='{OWNER_ID}' and d.visibility='{VISIBILITY}'
    and d.chunk_count <> (select count(*) from public.resource_chunks rc where rc.document_id=d.id);""")

# ---- 幂等:已灌入的 title ----
done = set()
ex = sql(f"select distinct title from public.documents where owner_id='{OWNER_ID}' and visibility='{VISIBILITY}';")
if ex:
    done = {x["title"] for x in ex}
    print(f"已存在 {len(done)} 篇,跳过它们。")

n = 0
for doc_key, chunks in docs.items():
    chunks.sort(key=lambda c: c["chunk_index"])
    title = chunks[0]["source_title"]
    if title in done:
        continue
    # 1) documents 行
    drow = sql(f"""insert into public.documents
      (owner_id,title,layer,visibility,resource_type,source_type,processing_status,chunk_count,embed_model)
      values ('{OWNER_ID}','{esc(title)}',{LAYER},'{VISIBILITY}','journal_article','platform_preset','completed',{len(chunks)},'{EMBED_MODEL}')
      returning id;""")
    did = drow[0]["id"]
    # 2) 嵌入
    embs = embed([c["content"] for c in chunks])
    # 3) resource_chunks(分批 INSERT)
    for i in range(0, len(chunks), CHUNK_BATCH):
        vals = []
        for j, c in enumerate(chunks[i:i + CHUNK_BATCH]):
            vec = "[" + ",".join(f"{x:.6f}" for x in embs[i + j]) + "]"
            vals.append(f"('{did}','{OWNER_ID}',{LAYER},'{VISIBILITY}','{esc(c['content'])}',{c['chunk_index']},'{vec}'::vector,'{esc(title)}',{c['n_tokens_approx']})")
        sql("insert into public.resource_chunks (document_id,owner_id,layer,visibility,content,chunk_index,embedding,source_title,token_count) values "
            + ",".join(vals) + ";")
    n += 1
    print(f"  [{n}] {title[:55]}  ({len(chunks)} chunks)")

print(f"✅ 完成。本次新增 {n} 篇。")
