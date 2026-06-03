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

## Deploy on Railway (recommended)
1. Repo is already on GitHub `main`.
2. Railway → New Project → Deploy from GitHub repo → pick this repo.
3. **Settings → Root Directory = `code-interpreter`** (so it finds `main.py` / `requirements.txt` / `Procfile`).
4. **Variables** (Railway secret store — never in git):
   - `E2B_API_KEY` = your `e2b_...` key
   - `SUPABASE_JWT_SECRET` = Supabase → Project Settings → API → **JWT Secret**
   - `ALLOWED_ORIGINS` = `https://techedu.icu,http://localhost:5173`
5. Deploy → Railway gives `https://xxx.up.railway.app`.
6. Validate: `curl https://xxx.up.railway.app/healthz` → `{"ok":true,"e2b_key_set":true}`.

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
