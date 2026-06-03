"""
techedu.icu — code-interpreter backend (Phase 0/1)

A tiny FastAPI service that runs LLM-generated Python in an isolated E2B sandbox
(pandas / matplotlib / openpyxl / python-docx preinstalled) and returns stdout +
charts (base64 PNG) + generated files (base64). Deploy on Railway/Fly (US region —
E2B's api.e2b.dev is GFW-blocked from China but reachable from US hosts).

Auth: verifies the Supabase access token (same JWT the frontend already holds).
Secrets (set as Railway/Fly env vars, NEVER commit):
  E2B_API_KEY           your E2B key (e2b_...)
  SUPABASE_JWT_SECRET   Supabase project JWT secret (Project Settings → API → JWT)
  ALLOWED_ORIGINS       comma list, e.g. https://techedu.icu,http://localhost:5173

E2B SDK note: the calls below use the stable core API (Sandbox / run_code /
logs.stdout / results[].png / kill) and write/read files via run_code itself, so
they are tolerant of SDK file-API drift. Validate on the first Railway deploy.
"""
import os
import base64
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import jwt

E2B_API_KEY = os.environ.get("E2B_API_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get(
    "ALLOWED_ORIGINS", "https://techedu.icu,http://localhost:5173").split(",") if o.strip()]
SANDBOX_TIMEOUT = int(os.environ.get("SANDBOX_TIMEOUT", "60"))
MAX_CODE = int(os.environ.get("MAX_CODE", "20000"))

app = FastAPI(title="techedu code-interpreter backend", version="0.1")
app.add_middleware(
    CORSMiddleware, allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET", "OPTIONS"], allow_headers=["*"],
)


def verify_user(authorization: str) -> str:
    """Return the Supabase user id from the bearer JWT, or 401."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        if SUPABASE_JWT_SECRET:
            payload = jwt.decode(token, SUPABASE_JWT_SECRET,
                                 algorithms=["HS256"], audience="authenticated")
        else:  # dev fallback only — DO NOT run prod without the secret
            payload = jwt.decode(token, options={"verify_signature": False})
        return payload.get("sub") or "anon"
    except Exception as e:
        raise HTTPException(401, f"invalid token: {e}")


class RunReq(BaseModel):
    code: str
    files: list[dict] = []          # input files: [{"name": "data.csv", "b64": "..."}]
    return_files: list[str] = []    # filenames under /data/ to return as base64


@app.get("/healthz")
def healthz():
    return {"ok": True, "e2b_key_set": bool(E2B_API_KEY)}


@app.post("/run")
def run(req: RunReq, authorization: str = Header(default="")):
    uid = verify_user(authorization)
    if not E2B_API_KEY:
        raise HTTPException(503, "E2B_API_KEY not configured")
    if len(req.code) > MAX_CODE:
        raise HTTPException(400, "code too long")

    from e2b_code_interpreter import Sandbox  # imported lazily so /healthz works without network

    sbx = Sandbox(api_key=E2B_API_KEY, timeout=SANDBOX_TIMEOUT)
    try:
        # write input files via a prelude (SDK-agnostic — only uses run_code)
        prelude = "import os,base64\nos.makedirs('/data',exist_ok=True)\n"
        for f in req.files[:5]:
            prelude += (f"open('/data/{f['name']}','wb')"
                        f".write(base64.b64decode({f['b64']!r}))\n")

        ex = sbx.run_code(prelude + "\n" + req.code)

        charts = [r.png for r in (ex.results or []) if getattr(r, "png", None)]

        out_files = []
        for name in req.return_files[:5]:
            r = sbx.run_code(
                f"import base64;print(base64.b64encode(open('/data/{name}','rb').read()).decode())")
            b64 = (r.logs.stdout or "").strip()
            if b64 and not r.error:
                out_files.append({"name": name, "b64": b64})

        return {
            "uid": uid,
            "stdout": (ex.logs.stdout or "")[:20000],
            "stderr": (ex.logs.stderr or "")[:4000],
            "error": str(ex.error) if ex.error else None,
            "charts": charts,        # base64 PNG strings (matplotlib auto-captured)
            "files": out_files,      # [{"name","b64"}]
        }
    finally:
        try:
            sbx.kill()
        except Exception:
            pass
