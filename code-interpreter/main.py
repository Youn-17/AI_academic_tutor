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
import json
import urllib.request
import uuid
import jwt

E2B_API_KEY = os.environ.get("E2B_API_KEY", "")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")  # optional fallback
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
    """Verify the Supabase access token → user id (401 if invalid).

    Primary: ask Supabase who the token belongs to (works for both legacy HS256 and
    the new asymmetric signing keys — only needs the public anon key, no shared secret).
    Falls back to a local JWT secret; if neither is configured, fails closed (401).
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization.split(" ", 1)[1]
    if SUPABASE_URL and SUPABASE_ANON_KEY:
        try:
            req = urllib.request.Request(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY})
            with urllib.request.urlopen(req, timeout=10) as r:
                return json.loads(r.read()).get("id") or "anon"
        except Exception as e:
            raise HTTPException(401, f"invalid token: {e}")
    if SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"],
                              audience="authenticated").get("sub") or "anon"
        except Exception as e:
            raise HTTPException(401, f"invalid token: {e}")
    # fail closed: no verification method available (neither SUPABASE_URL nor SUPABASE_JWT_SECRET configured)
    raise HTTPException(401, "token verification unavailable")


def upload_to_storage(token: str, uid: str, name: str, data: bytes):
    """Upload bytes to the public 'code-outputs' bucket via the caller's token → public URL (or None)."""
    if not (SUPABASE_URL and token and data):
        return None
    key = f"{uid}/{uuid.uuid4().hex[:8]}_{name}"
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/storage/v1/object/code-outputs/{key}",
            data=data, method="POST",
            headers={"Authorization": token, "Content-Type": "application/octet-stream", "x-upsert": "true"})
        urllib.request.urlopen(req, timeout=30)
        return f"{SUPABASE_URL}/storage/v1/object/public/code-outputs/{key}"
    except Exception:
        return None


class RunReq(BaseModel):
    code: str
    files: list[dict] = []          # input files: [{"name": "data.csv", "b64": "..."}]
    return_files: list[str] = []    # filenames under /data/ to return as base64


@app.get("/")
@app.head("/")
def root():
    # 200 on "/" so any HTTP startup/liveness probe that hits the root passes.
    return {"service": "code-interpreter", "ok": True}


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

    from e2b_code_interpreter import Sandbox  # lazy import so /healthz works without network

    def _txt(v):  # SDK v2: logs.stdout/stderr are lists of strings
        if isinstance(v, list):
            return "".join(str(x) for x in v)
        return str(v or "")

    try:
        # SDK v2 API: create a sandbox via the classmethod; api key is read from the
        # E2B_API_KEY env var (set on Cloud Run). The old `Sandbox(api_key=, timeout=)`
        # constructor form is not valid in v2 and raised → 500.
        sbx = Sandbox.create(timeout=SANDBOX_TIMEOUT)
    except Exception as e:
        raise HTTPException(502, f"sandbox create failed: {type(e).__name__}: {e}")

    try:
        # ensure doc-gen libs when the code needs them (E2B template already has the DS stack)
        _need = []
        if any(k in req.code for k in ("openpyxl", "to_excel", ".xlsx")):
            _need.append("openpyxl")
        if "docx" in req.code:
            _need.append("python-docx")
        # write input files via a prelude (SDK-agnostic — only uses run_code)
        prelude = "import os,base64\nos.makedirs('/data',exist_ok=True)\n"
        if _need:
            prelude += f"import subprocess,sys;subprocess.run([sys.executable,'-m','pip','install','-q']+{_need!r},check=False)\n"
        for f in req.files[:5]:
            prelude += (f"open('/data/{f['name']}','wb')"
                        f".write(base64.b64decode({f['b64']!r}))\n")

        ex = sbx.run_code(prelude + "\n" + req.code)

        charts = [r.png for r in (ex.results or []) if getattr(r, "png", None)]

        out_files = []
        for name in req.return_files[:5]:
            r = sbx.run_code(
                f"import base64;print(base64.b64encode(open('/data/{name}','rb').read()).decode())")
            b64 = _txt(r.logs.stdout).strip()
            if b64 and not r.error:
                try:
                    data = base64.b64decode(b64)
                except Exception:
                    data = b""
                url = upload_to_storage(authorization, uid, name, data)
                out_files.append({"name": name, "url": url} if url else {"name": name, "b64": b64})

        return {
            "uid": uid,
            "stdout": _txt(ex.logs.stdout)[:20000],
            "stderr": _txt(ex.logs.stderr)[:4000],
            "error": str(ex.error) if ex.error else None,
            "charts": charts,        # base64 PNG strings (matplotlib auto-captured)
            "files": out_files,      # [{"name","b64"}]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"run failed: {type(e).__name__}: {e}")
    finally:
        try:
            sbx.kill()
        except Exception:
            pass
