"""Multi-agent orchestrator — the L3 backend orchestration core (Cloud Run, Python).

Ports the edge-function runOrchestrator to Python with no ~150s wall-clock cap (ADR-0002),
grounded in the Liu et al. (2026) educational-agent role taxonomy (CONTEXT.md: Specialist).

Design (CLAUDE.md):
  - A DEEP module behind a small interface — `run_orchestrator(task, io)`.
  - ALL I/O (LLM calls, KB retrieval, code execution, web search, SSE emit) is injected via
    the `OrchestratorIO` seam, so the orchestration logic is unit-testable WITHOUT network
    (see test_orchestrator.py). The endpoint wires the real httpx/E2B/Supabase adapters.
  - Synthesis carries the epistemic-agency guardrail (ADR-0004): scaffold, don't hand answers.
"""
from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional


def extract_json(raw: str) -> Optional[dict]:
    """Pull a JSON object out of an LLM reply: strip ```json fences, take the outermost {...},
    parse. Returns None if none/malformed (callers fall back). Pure + testable."""
    s = (raw or "").strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", s, re.IGNORECASE)
    if fence:
        s = fence.group(1).strip()
    a, b = s.find("{"), s.rfind("}")
    if a < 0 or b <= a:
        return None
    try:
        return json.loads(s[a : b + 1])
    except Exception:
        return None


def extract_code(s: str) -> str:
    """Strip a ```python fence to get runnable code."""
    m = re.search(r"```(?:python)?\s*([\s\S]*?)```", s or "", re.IGNORECASE)
    return (m.group(1) if m else (s or "")).strip()


# Specialist roster, positioned by the Liu et al. (2026) role taxonomy (CONTEXT.md: Specialist).
ROSTER: dict[str, dict] = {
    "retriever": {"label": "检索专员", "tool": "retrieve"},   # cognitive-epistemic
    "analyst": {"label": "数据分析师", "tool": "run_code"},    # cognitive-epistemic (compute)
    "reasoner": {"label": "推理顾问", "tool": None},           # self-regulatory
    "affective": {"label": "学习伙伴", "tool": None},          # socio-emotional
    "web": {"label": "联网调研员", "tool": "web"},             # human-AI interaction
}

# ADR-0004: the synthesis protects epistemic agency — scaffold, don't hand copyable answers.
SYNTH_GUARDRAIL = """你是学习辅导团队的"组长"，把各专科 agent 的发现整合成给学生的最终回答：
1. 开头先用一行『概要：…』给出最核心的结论或方向（≤2 句，让学生一眼抓住重点）；正文用 `## 小标题` 分节（每个标题≤14 字、只聚焦一点），节内可配列表。便于折叠浏览。
2. 标注依据来源（书/论文/网址/计算结果），区分"有依据的结论"与"推理推测"。
3. 【关键】保护学生认知主体性：不要代替学生思考或给可照抄的成品；用引导性问题、给方法与思路、指出如何自己验证下一步，培养而非削弱独立思考。
4. 证据不足或冲突时如实说明不确定性。
5. 若收到【质检员意见】，据此补齐缺口、对不确定处加注，并保持温暖、能维持学习动机的语气。
用中文回答。"""

# Reflexion (Ch4.4 Execute→Reflect→Refine): the lead reviews its own draft answer.
REFLECT_PROMPT = """你是组长的"自检员"。审查这份即将给学生的回答草稿：
1. 有无事实/逻辑错误、遗漏的关键方面、或未被证据支持的断言；
2. 是否违反认识主体性护栏（代替学生思考、给可照抄的成品）。
只输出 JSON：{"ok": true/false, "feedback": "需要修订什么（ok 时留空）"}。没有实质问题就 ok=true，不要鸡蛋里挑骨头。"""


@dataclass
class OrchestratorIO:
    """The injected I/O seam. CLAUDE.md: the interface is the test surface."""

    llm: Callable[[str, str, bool], Awaitable[str]]   # (system, user, json_mode) -> full text
    retrieve: Callable[[str], Awaitable[str]]          # (query) -> joined KB chunks
    run_code: Callable[[str], Awaitable[str]]          # (python) -> stdout/result text
    emit: Callable[[dict], None]                       # SSE event sink
    web: Optional[Callable[[str], Awaitable[str]]] = None          # (query) -> results
    stream: Optional[Callable[[str, str], Awaitable[str]]] = None  # streamed synth; emits + returns full
    compose: Optional[Callable[[str, str], Awaitable[str]]] = None # non-streamed LONG llm → enables Reflexion (Ch4.4)

    @property
    def has_web(self) -> bool:
        return self.web is not None


async def plan_subtasks(task: str, io: OrchestratorIO) -> list[dict]:
    """Lead agent: decompose the task into 2-3 specialist subtasks, optionally with dependencies
    (Plan-and-Solve: a subtask may build on an earlier one's output). Falls back safely. Deps are
    clamped to earlier *kept* subtasks — no forward refs, no cycles, no dangling indices."""
    web_line = "\n- web（联网调研员）：联网搜索最新/实时信息" if io.has_web else ""
    system = (
        '你是多智能体学习辅导团队的"组长"。把学生任务拆成 2-3 个聚焦子任务，分派给最合适的专科：\n'
        "- retriever（检索专员）：检索平台知识库\n"
        "- analyst（数据分析师）：写并运行 Python 做计算/画图\n"
        "- reasoner（推理顾问）：纯推理/批判分析/方案设计\n"
        "- affective（学习伙伴）：情感支持/动机调节" + web_line +
        "\n若某子任务必须基于另一子任务的产出（如先检索证据、再据此推理），用 deps 标出它依赖的子任务序号"
        "（从 0 开始，只能依赖更靠前的；多数情况无依赖，省略或留空数组）。"
        '\n原则：只派真正需要的；能并行就别造依赖。只输出 JSON：'
        '{"plan":[{"role":"retriever","subtask":"…"},{"role":"reasoner","subtask":"…","deps":[0]}]}'
    )
    parsed = extract_json(await io.llm(system, task, True))
    raw = parsed.get("plan") if (parsed and isinstance(parsed.get("plan"), list)) else []
    # pass 1: keep valid (role, subtask) items, remembering each item's ORIGINAL index for dep remap
    kept: list[tuple] = []
    for i, x in enumerate(raw):
        role = str(x.get("role", "")).lower()
        sub = str(x.get("subtask", ""))
        if role in ROSTER and sub:
            kept.append((i, role, sub, x.get("deps", []) or []))
    kept = kept[:3]
    orig_to_new = {orig: new for new, (orig, *_rest) in enumerate(kept)}
    # pass 2: remap deps through the filter; drop forward / out-of-range / dropped-target refs
    plan: list[dict] = []
    for new_idx, (_orig, role, sub, deps_raw) in enumerate(kept):
        deps: list[int] = []
        for d in deps_raw:
            try:
                nd = orig_to_new.get(int(d))
            except (TypeError, ValueError):
                continue
            if nd is not None and nd < new_idx and nd not in deps:  # earlier-only → acyclic
                deps.append(nd)
        plan.append({"role": role, "subtask": sub, "deps": deps})
    return plan or [
        {"role": "retriever", "subtask": task, "deps": []},
        {"role": "reasoner", "subtask": task, "deps": []},
    ]


def _dep_context(step: dict, done: dict) -> str:
    """Concatenate the findings of this step's satisfied dependencies (Plan-and-Solve context)."""
    deps = [d for d in step.get("deps", []) if d in done]
    if not deps:
        return ""
    return "\n\n".join(
        f"【{done[d]['label']}的发现】{str(done[d]['finding'])[:800]}" for d in deps)


async def run_specialist(step: dict, io: OrchestratorIO, context: str = "") -> dict:
    """Run one specialist by its taxonomy role. NEVER raises — a failure becomes a finding,
    so one slow/dead specialist can't break the gather (mirrors the edge-fn guarantee).
    `context` carries upstream dependency findings (Plan-and-Solve); it is injected into the
    reasoning roles' prompt, NOT into retrieval/web queries (those must stay clean search terms)."""
    role = step["role"]
    label = ROSTER[role]["label"]
    io.emit({"_team_step": {"phase": "work", "role": role, "agent": label,
                            "subtask": step["subtask"], "builds_on": bool(context),
                            "status": "running"}})
    sub = step["subtask"]
    sub_ctx = f"{sub}\n\n【前序专科的发现，可参考但需自行判断】\n{context}" if context else sub
    finding = ""
    try:
        if role == "analyst":
            code = extract_code(await io.llm(
                "你是数据分析师。针对子任务写完整可运行的 Python（已装 pandas/numpy/matplotlib），"
                "用 print() 输出关键结论，画图 plt.show()。只输出代码。", sub_ctx, False))
            finding = await io.run_code(code) if code else "（未能生成可运行代码）"
        elif role == "retriever":
            finding = await io.retrieve(sub)
        elif role == "web" and io.web is not None:
            finding = await io.web(sub)
        elif role == "affective":
            finding = await io.llm(
                "你是学习伙伴（情感支持）。给真诚共情、把困境正常化，并给一个现在就能做的最小一步与一个"
                "情绪/动机调节建议。不代替学生完成学业任务。", sub_ctx, False)
        else:  # reasoner (and any tool-less fallback)
            finding = await io.llm(
                "你是推理顾问。对子任务做严谨的分析/推理/方案设计，给有条理的要点。不编造文献或数据。",
                sub_ctx, False)
    except Exception:
        finding = f"（{label}未能完成该子任务）"
    io.emit({"_team_step": {"phase": "work", "role": role, "agent": label, "status": "done"}})
    return {"label": label, "subtask": step["subtask"], "finding": finding}


async def review(task: str, findings: list[dict], io: OrchestratorIO) -> str:
    """Lightweight critic: flag gaps for the synthesis. Best-effort, no extra round (time budget)."""
    io.emit({"_team_step": {"phase": "review", "status": "running"}})
    notes = ""
    try:
        body = "\n\n".join(f"【{f['label']}】{f['subtask']}\n{str(f['finding'])[:1000]}" for f in findings)
        parsed = extract_json(await io.llm(
            '你是团队"质检员"。快速审查各专科发现是否充分回答了学生任务：指出关键缺口、未被证据支持的说法、'
            '遗漏的角度，供组长综合时补强。只输出 JSON：{"notes":"质检要点(简短)"}',
            f"学生任务：{task}\n\n各专科发现：\n{body}", True))
        notes = str((parsed or {}).get("notes", ""))
    except Exception:
        pass
    io.emit({"_team_step": {"phase": "review", "status": "done", "notes": notes}})
    return notes


async def reflect_refine(task: str, draft: str, io: OrchestratorIO, max_rounds: int = 1) -> str:
    """Reflexion (Ch4.4 Execute→Reflect→Refine): the lead reviews its own draft and refines it if
    there are real issues. Backend-only (no edge wall-clock cap). Best-effort, never raises."""
    for _ in range(max_rounds):
        io.emit({"_team_step": {"phase": "reflect", "status": "running"}})
        feedback, ok = "", True
        try:
            verdict = extract_json(await io.llm(
                REFLECT_PROMPT, f"学生任务：{task}\n\n待审草稿：\n{draft[:4000]}", True)) or {}
            ok = bool(verdict.get("ok", True))
            feedback = str(verdict.get("feedback", ""))
        except Exception:
            ok = True
        io.emit({"_team_step": {"phase": "reflect", "status": "done", "notes": feedback}})
        if ok or not feedback.strip() or io.compose is None:
            break
        try:
            refined = await io.compose(
                SYNTH_GUARDRAIL,
                f"学生任务：{task}\n\n你的上一版草稿：\n{draft}\n\n自检反馈（据此修订）：\n{feedback}\n\n"
                "请输出修订后的完整回答，保持上述护栏。")
            if refined.strip():
                draft = refined
        except Exception:
            break
    return draft


async def synthesize(task: str, findings: list[dict], critic_notes: str, io: OrchestratorIO) -> str:
    """Lead agent: integrate findings into the final answer, guardrail-bound. When io.compose is
    wired, runs the Reflexion loop (draft → reflect → refine) then streams the final; otherwise
    streams the synthesis directly."""
    io.emit({"_team_step": {"phase": "synth", "status": "running"}})
    body = "\n\n---\n\n".join(f"【{f['label']}】子任务：{f['subtask']}\n{f['finding']}" for f in findings)
    user = f"学生任务：{task}\n\n各专科 agent 的发现：\n\n{body}"
    if critic_notes:
        user += f"\n\n---\n\n【质检员意见】{critic_notes}"

    answer = ""
    if io.compose is not None:
        # Reflexion path: a non-streamed draft we can review, then refine, then stream the final.
        try:
            answer = await io.compose(SYNTH_GUARDRAIL, user)
        except Exception:
            answer = ""
        if answer.strip():
            answer = await reflect_refine(task, answer, io, max_rounds=1)
        for i in range(0, len(answer), 80):
            io.emit({"choices": [{"index": 0, "delta": {"content": answer[i : i + 80]}}]})
    else:
        # streaming path (no Reflexion seam wired — e.g. unit tests / the edge fallback shape)
        try:
            if io.stream is not None:
                answer = await io.stream(SYNTH_GUARDRAIL, user)
            else:
                answer = await io.llm(SYNTH_GUARDRAIL, user, False)
                for i in range(0, len(answer), 60):
                    io.emit({"choices": [{"index": 0, "delta": {"content": answer[i : i + 60]}}]})
        except Exception:
            answer = ""

    if not answer.strip():
        # guarantee a non-empty result from the raw findings (drop error-only findings)
        good = [f for f in findings if f["finding"] and not str(f["finding"]).startswith("（")]
        answer = "\n\n".join(f"**{f['label']}**\n{f['finding']}" for f in good) \
            or "（团队这次没能形成结论，请换个问法或稍后重试。）"
        for i in range(0, len(answer), 80):
            io.emit({"choices": [{"index": 0, "delta": {"content": answer[i : i + 80]}}]})

    io.emit({"_team_step": {"phase": "synth", "status": "done"}})
    return answer


async def run_orchestrator(task: str, io: OrchestratorIO) -> str:
    """The deep module: plan → parallel specialists → critic → synthesize. Emits SSE events
    through io.emit; returns the final answer text. No wall-clock cap (ADR-0002)."""
    io.emit({"_team_step": {"phase": "plan", "status": "running"}})
    plan = await plan_subtasks(task, io)
    io.emit({"_team_step": {"phase": "plan", "status": "done",
                            "plan": [{"role": p["role"], "label": ROSTER[p["role"]]["label"],
                                      "subtask": p["subtask"], "deps": p.get("deps", [])}
                                     for p in plan]}})

    # Dependency-aware execution (Plan-and-Solve): run in waves by the deps DAG. Specialists whose
    # deps are done run in parallel and SEE those findings injected as context; a no-deps plan is a
    # single parallel wave — i.e. the prior behavior, zero regression.
    findings: list = [None] * len(plan)
    done: dict = {}
    remaining = set(range(len(plan)))
    while remaining:
        ready = [i for i in sorted(remaining) if all(d in done for d in plan[i].get("deps", []))]
        if not ready:  # deps are clamped to earlier items, so this is unreachable; run rest blind
            ready = sorted(remaining)
        wave = await asyncio.gather(
            *(run_specialist(plan[i], io, _dep_context(plan[i], done)) for i in ready))
        for i, r in zip(ready, wave):
            findings[i] = r
            done[i] = r
            remaining.discard(i)

    ordered = [f for f in findings if f is not None]
    critic_notes = await review(task, ordered, io)
    return await synthesize(task, ordered, critic_notes, io)
