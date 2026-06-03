# techedu code-interpreter backend (Phase 0/1)

Tiny FastAPI service that runs LLM-generated Python in an **E2B sandbox** (pandas /
matplotlib / openpyxl / python-docx) and returns stdout + charts (base64 PNG) +
generated files (base64). It's the "real agent" compute layer the Supabase edge
function can't host. Full design: `../CODE_INTERPRETER_AND_RAG_BACKEND_PLAN.md`.

## Endpoints
- `GET /healthz` → `{ok, e2b_key_set}`
- `POST /run` (Bearer = Supabase access token) →
  body `{ code, files?:[{name,b64}], return_files?:[name] }` →
  `{ stdout, stderr, error, charts:[b64png], files:[{name,b64}] }`

## ⚠️ China / GFW note (verified)
`api.e2b.dev` is **blocked from mainland China** networks, so **deploy on a US/EU host**
(Railway/Fly) where E2B is reachable. Students' browsers hit THIS backend (not E2B
directly) → they work fine from China. Local dev against E2B needs a VPN/proxy.

## Deploy on Google Cloud Run (recommended — Docker)
Prereqs: a GCP project with **billing enabled** + `gcloud` CLI (`gcloud auth login`; `gcloud config set project <PROJECT_ID>`). One command builds the Dockerfile and deploys (no manual `docker build/push`):

```bash
cd code-interpreter
gcloud run deploy ci-backend \
  --source . \
  --region asia-east1 \              # Taiwan: low latency for CN users; reaches E2B fine
  --allow-unauthenticated \          # app-level auth is the Supabase JWT, not Cloud Run IAM
  --memory 512Mi --cpu 1 --timeout 300 \
  --min-instances 0 \                # set 1 to kill cold-start lag (small cost)
  --set-env-vars "ALLOWED_ORIGINS=https://techedu.icu,SUPABASE_URL=https://oztozjwngekmqtuylypt.supabase.co,SUPABASE_ANON_KEY=YOUR_ANON_KEY,E2B_API_KEY=YOUR_E2B_KEY"
# NOTE: one --set-env-vars only (repeating the flag overwrites). Values must NOT contain
# commas (that's the pair delimiter). For multiple CORS origins use the ^@^ delimiter:
#   --set-env-vars "^@^ALLOWED_ORIGINS=https://a.com,https://b.com@SUPABASE_URL=...@E2B_API_KEY=..."
```
→ prints a URL like `https://ci-backend-xxxx.asia-east1.run.app`.

**Better for secrets** — use Secret Manager instead of plain env vars:
```bash
echo -n "YOUR_E2B_KEY" | gcloud secrets create e2b-api-key --data-file=-
gcloud run deploy ci-backend --source . --region asia-east1 --allow-unauthenticated \
  --update-secrets "E2B_API_KEY=e2b-api-key:latest"
```
Validate: `curl https://<url>/healthz` → `{"ok":true,"e2b_key_set":true}`.

### Cloud Run gotchas
- **$PORT**: handled — the Dockerfile binds `$PORT` (Cloud Run sends 8080). Don't hardcode a port.
- **China 可达性**: `*.run.app` 从中国大陆可能不稳。给学生用就**绑自定义域**(Cloud Run → Manage Custom Domains)或用你的 **EdgeOne** CDN 兜一层。E2B ← Cloud Run 这一跳没问题(Google 网络)。
- **冷启动**: 缩容到 0 → 首次调用慢;`--min-instances 1` 可消除。
- **区域**: `asia-east1`(台湾)延迟好且能连 E2B;`us-central1` 亦可。
- **沙箱在远端**: 重活在 E2B 上跑,所以容器 512Mi/1CPU 足够。

## Alternative: Railway
Deploy from GitHub repo → **Root Directory = `code-interpreter`**(用 Procfile)→ 设 `E2B_API_KEY` / `SUPABASE_JWT_SECRET` / `ALLOWED_ORIGINS` → `curl .../healthz`。

## Validate /run end-to-end
```bash
TOKEN="<a logged-in student's supabase access_token>"   # from the browser session
curl -s -X POST https://xxx.up.railway.app/run \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"import pandas as pd, matplotlib; matplotlib.use(\"Agg\"); import matplotlib.pyplot as plt; df=pd.DataFrame({\"g\":[\"A\",\"B\"],\"v\":[3,7]}); print(df); plt.bar(df.g,df.v); plt.show(); df.to_excel(\"/data/out.xlsx\",index=False)","return_files":["out.xlsx"]}'
```
Expect: dataframe in `stdout`, a base64 PNG in `charts`, `out.xlsx` in `files`.
**This is the moment we confirm the E2B key works** (couldn't test locally — GFW).

## Next (Phase 2+)
- Upload `files[]` → Supabase Storage → signed URLs (instead of base64).
- Wire `run_python` as a tool in the chat edge fn (plan §4, "路 A").
- RAG endpoints (`/rag/ingest` via DeepDoc, `/rag/deep_search`).

## Local run (needs VPN for E2B)
```bash
cd code-interpreter && cp .env.example .env   # fill real values (gitignored)
pip install -r requirements.txt
export $(grep -v '^#' .env | xargs) && uvicorn main:app --reload
```
