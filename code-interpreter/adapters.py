"""Real-service adapters that satisfy the orchestrator's I/O seam (OrchestratorIO).

Kept separate from the pure core (orchestrator.py) so the core stays network-free and
unit-testable (CLAUDE.md: the interface is the test surface). These are thin glue over
httpx (DMXAPI / Supabase REST / Tavily) and the injected E2B runner; they are exercised
by integration (a live /orchestrate call), not unit tests.
"""
from __future__ import annotations

import asyncio
import json
from typing import Awaitable, Callable, Optional

import httpx

DMXAPI_CHAT = "https://www.dmxapi.cn/v1/chat/completions"
DMXAPI_EMBED = "https://www.dmxapi.cn/v1/embeddings"


async def _post_json(url: str, key: str, body: dict, timeout: float = 120) -> dict:
    async with httpx.AsyncClient(timeout=timeout) as c:
        r = await c.post(url, json=body, headers={
            "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        r.raise_for_status()
        return r.json()


def make_llm(api_url: str, key: str, model: str) -> Callable[[str, str, bool], Awaitable[str]]:
    async def llm(system: str, user: str, json_mode: bool = False) -> str:
        body = {
            "model": model, "temperature": 0.4, "max_tokens": 1600,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}
        j = await _post_json(api_url, key, body)
        return (j.get("choices") or [{}])[0].get("message", {}).get("content") or ""
    return llm


def make_compose(api_url: str, key: str, model: str) -> Callable[[str, str], Awaitable[str]]:
    """Non-streamed LONG completion — the Reflexion draft + refine (Ch4.4)."""
    async def compose(system: str, user: str) -> str:
        body = {
            "model": model, "temperature": 0.6, "max_tokens": 6000,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        j = await _post_json(api_url, key, body, timeout=180)
        return (j.get("choices") or [{}])[0].get("message", {}).get("content") or ""
    return compose


def make_stream(api_url: str, key: str, model: str,
                emit: Callable[[dict], None]) -> Callable[[str, str], Awaitable[str]]:
    async def stream(system: str, user: str) -> str:
        body = {
            "model": model, "temperature": 0.6, "max_tokens": 6000, "stream": True,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }
        full = ""
        async with httpx.AsyncClient(timeout=180) as c:
            async with c.stream("POST", api_url, json=body,
                                headers={"Authorization": f"Bearer {key}"}) as r:
                async for line in r.aiter_lines():
                    line = line.strip()
                    if not line.startswith("data:"):
                        continue
                    d = line[5:].strip()
                    if d == "[DONE]" or not d:
                        continue
                    try:
                        delta = (json.loads(d).get("choices") or [{}])[0].get("delta", {}).get("content")
                    except Exception:
                        delta = None
                    if delta:
                        full += delta
                        emit({"choices": [{"index": 0, "delta": {"content": delta}}]})
        return full
    return stream


def make_retrieve(supa_url: str, service_key: str, embed_url: str, embed_key: str,
                  uid: str, course_id: Optional[str]) -> Callable[[str], Awaitable[str]]:
    async def retrieve(query: str) -> str:
        try:
            ej = await _post_json(embed_url, embed_key,
                                  {"model": "text-embedding-3-small", "input": query}, timeout=30)
            vec = ej["data"][0]["embedding"]
            async with httpx.AsyncClient(timeout=30) as c:
                r = await c.post(
                    f"{supa_url}/rest/v1/rpc/match_chunks",
                    json={"query_embedding": "[" + ",".join(map(str, vec)) + "]",
                          "p_user_id": uid, "p_course_id": course_id, "p_layer_filter": None,
                          "match_count": 6, "similarity_threshold": 0.3},
                    headers={"apikey": service_key, "Authorization": f"Bearer {service_key}",
                             "Content-Type": "application/json"})
                rows = r.json() if r.status_code == 200 else []
            if not rows:
                return "知识库中未找到相关内容。"
            return "\n\n".join(
                f"[{i + 1}] {row.get('source_title', '知识库')}：{str(row.get('content', ''))[:500]}"
                for i, row in enumerate(rows))
        except Exception:
            return "（知识库检索暂时不可用）"
    return retrieve


def make_run_code(run_sync: Callable[[str], str]) -> Callable[[str], Awaitable[str]]:
    """Wrap the blocking E2B runner so it doesn't block the event loop."""
    async def run_code(code: str) -> str:
        try:
            return await asyncio.to_thread(run_sync, code)
        except Exception as e:
            return f"（代码执行出错：{type(e).__name__}）"
    return run_code


def make_web(tavily_key: Optional[str]) -> Optional[Callable[[str], Awaitable[str]]]:
    if not tavily_key:
        return None

    async def web(query: str) -> str:
        try:
            j = await _post_json(
                "https://api.tavily.com/search", tavily_key,
                {"query": query, "search_depth": "basic", "max_results": 5,
                 "include_answer": "advanced"}, timeout=30)
            rows = j.get("results", [])
            ans = f"【综合】{j.get('answer', '')}\n\n" if j.get("answer") else ""
            return ans + "\n\n".join(
                f"[{i + 1}] {x.get('title', '')}\n{x.get('url', '')}\n{str(x.get('content', ''))[:300]}"
                for i, x in enumerate(rows))
        except Exception:
            return "（联网搜索暂时不可用）"
    return web


async def resolve_key(supa_url: str, service_key: str, providers: list[str],
                      platform_only: bool = True) -> Optional[str]:
    """Resolve an API key via Supabase REST + service role. AI keys: platform-scoped only
    (ADR-0003 — no cross-tenant reuse). Non-sensitive keys (tavily): any active key."""
    prov = "(" + ",".join(providers) + ")"
    scope = "&scope=eq.platform" if platform_only else ""
    url = (f"{supa_url}/rest/v1/ai_api_configs?select=api_key&is_active=eq.true"
           f"&provider=in.{prov}{scope}&api_key=not.is.null&limit=1")
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(url, headers={"apikey": service_key,
                                          "Authorization": f"Bearer {service_key}"})
            rows = r.json() if r.status_code == 200 else []
            return rows[0]["api_key"] if rows and rows[0].get("api_key") else None
    except Exception:
        return None
