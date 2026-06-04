"""Unit tests for the orchestrator core. No network: the I/O seam is faked, so we test the
orchestration logic directly (CLAUDE.md: the interface is the test surface). Run:
    python3 -m unittest test_orchestrator -v
"""
import unittest

from orchestrator import (
    OrchestratorIO,
    extract_code,
    extract_json,
    plan_subtasks,
    run_orchestrator,
    run_specialist,
)


class Recorder:
    """Captures emitted SSE events for assertions."""

    def __init__(self):
        self.events = []

    def emit(self, e):
        self.events.append(e)

    def phases(self):
        return [(ev["_team_step"]["phase"], ev["_team_step"]["status"])
                for ev in self.events if "_team_step" in ev]

    def content(self):
        return "".join(ev["choices"][0]["delta"]["content"]
                       for ev in self.events if "choices" in ev)


def make_io(rec, *, llm=None, retrieve=None, run_code=None, web=None, stream=None, compose=None):
    async def default_llm(system, user, json_mode):
        if json_mode and "plan" in system:
            return '{"plan":[{"role":"retriever","subtask":"找文献"},{"role":"reasoner","subtask":"分析"}]}'
        if json_mode and "质检员" in system:
            return '{"notes":"缺少具体例子"}'
        return f"[llm:{user[:8]}]"

    async def default_retrieve(q):
        return f"[kb:{q}]"

    async def default_run_code(code):
        return f"[ran:{code[:10]}]"

    return OrchestratorIO(
        llm=llm or default_llm,
        retrieve=retrieve or default_retrieve,
        run_code=run_code or default_run_code,
        emit=rec.emit, web=web, stream=stream, compose=compose,
    )


class TestPureHelpers(unittest.TestCase):
    def test_plain_json(self):
        self.assertEqual(extract_json('{"a": 1}'), {"a": 1})

    def test_fence_beats_trailing_prose_brace(self):
        # the genuine win over the old brace-slice: a ```json fence + trailing prose with braces
        raw = '当然：\n```json\n{"a": 1}\n```\n希望有帮助 {note}'
        self.assertEqual(extract_json(raw), {"a": 1})

    def test_no_json_returns_none(self):
        self.assertIsNone(extract_json("no json here"))

    def test_malformed_returns_none_not_raise(self):
        self.assertIsNone(extract_json("broken {not json"))

    def test_extract_code_strips_fence(self):
        self.assertEqual(extract_code("```python\nprint(1)\n```"), "print(1)")


class TestPlan(unittest.IsolatedAsyncioTestCase):
    async def test_parses_plan(self):
        io = make_io(Recorder())
        plan = await plan_subtasks("任务", io)
        self.assertEqual([p["role"] for p in plan], ["retriever", "reasoner"])

    async def test_garbage_falls_back(self):
        async def bad_llm(s, u, j):
            return "I cannot help"
        io = make_io(Recorder(), llm=bad_llm)
        plan = await plan_subtasks("任务", io)
        self.assertEqual([p["role"] for p in plan], ["retriever", "reasoner"])

    async def test_caps_at_three(self):
        async def big_llm(s, u, j):
            return ('{"plan":[{"role":"retriever","subtask":"a"},{"role":"reasoner","subtask":"b"},'
                    '{"role":"affective","subtask":"c"},{"role":"analyst","subtask":"d"}]}')
        io = make_io(Recorder(), llm=big_llm)
        plan = await plan_subtasks("任务", io)
        self.assertEqual(len(plan), 3)


class TestSpecialist(unittest.IsolatedAsyncioTestCase):
    async def test_retriever_uses_kb(self):
        f = await run_specialist({"role": "retriever", "subtask": "认知负荷"}, make_io(Recorder()))
        self.assertEqual(f["finding"], "[kb:认知负荷]")

    async def test_analyst_writes_and_runs_code(self):
        async def code_llm(s, u, j):
            return "```python\nprint('hi')\n```"
        f = await run_specialist({"role": "analyst", "subtask": "画图"},
                                 make_io(Recorder(), llm=code_llm))
        self.assertTrue(f["finding"].startswith("[ran:"))

    async def test_failure_becomes_finding_never_raises(self):
        async def boom_llm(s, u, j):
            raise RuntimeError("upstream 503")
        f = await run_specialist({"role": "reasoner", "subtask": "x"},
                                 make_io(Recorder(), llm=boom_llm))
        self.assertIn("未能完成", f["finding"])  # graceful, no exception


class TestOrchestratorEndToEnd(unittest.IsolatedAsyncioTestCase):
    async def test_full_run_emits_phases_and_returns_answer(self):
        rec = Recorder()
        answer = await run_orchestrator("认知负荷理论对设计 AI 辅导有何启示？", make_io(rec))
        phases = rec.phases()
        # plan → work(×2) → review → synth, each running then done
        self.assertIn(("plan", "running"), phases)
        self.assertIn(("plan", "done"), phases)
        self.assertIn(("review", "done"), phases)
        self.assertIn(("synth", "done"), phases)
        self.assertEqual(sum(1 for p, s in phases if p == "work" and s == "done"), 2)
        self.assertTrue(answer.strip())          # non-empty
        self.assertTrue(rec.content().strip())    # content was streamed to the client

    async def test_one_dead_specialist_does_not_break_the_team(self):
        # analyst's code-gen raises; the team must still finish with the other findings
        async def partial_llm(system, user, json_mode):
            if json_mode and "plan" in system:
                return '{"plan":[{"role":"analyst","subtask":"a"},{"role":"retriever","subtask":"b"}]}'
            if "数据分析师" in system:
                raise RuntimeError("code-gen down")
            if json_mode and "质检员" in system:
                return '{"notes":""}'
            return "ok"
        rec = Recorder()
        answer = await run_orchestrator("任务", make_io(rec, llm=partial_llm))
        self.assertTrue(answer.strip())  # survived the dead specialist


class TestReflexion(unittest.IsolatedAsyncioTestCase):
    async def test_reflect_refine_runs_when_compose_wired(self):
        calls = {"compose": 0}

        async def fake_compose(system, user):
            calls["compose"] += 1
            return f"draft-v{calls['compose']}"

        async def fake_llm(system, user, json_mode):
            if json_mode and "plan" in system:
                return '{"plan":[{"role":"reasoner","subtask":"x"}]}'
            if json_mode and "质检员" in system:
                return '{"notes":""}'
            if json_mode and "自检员" in system:
                return '{"ok":false,"feedback":"补一个例子"}'
            return "finding"

        rec = Recorder()
        answer = await run_orchestrator("任务", make_io(rec, llm=fake_llm, compose=fake_compose))
        self.assertEqual(calls["compose"], 2)          # draft + one refine
        self.assertEqual(answer, "draft-v2")            # the refined draft is returned
        self.assertIn(("reflect", "done"), rec.phases())

    async def test_reflect_ok_skips_refine(self):
        calls = {"compose": 0}

        async def fake_compose(system, user):
            calls["compose"] += 1
            return "clean-draft"

        async def fake_llm(system, user, json_mode):
            if json_mode and "plan" in system:
                return '{"plan":[{"role":"reasoner","subtask":"x"}]}'
            if json_mode and "自检员" in system:
                return '{"ok":true,"feedback":""}'
            return "ok"

        rec = Recorder()
        answer = await run_orchestrator("任务", make_io(rec, llm=fake_llm, compose=fake_compose))
        self.assertEqual(calls["compose"], 1)           # only the draft; no refine when ok
        self.assertEqual(answer, "clean-draft")


class TestDependencyPlanning(unittest.IsolatedAsyncioTestCase):
    async def test_plan_remaps_and_drops_bad_deps(self):
        # item0 declares a FORWARD dep [1] → drop; item1 deps [0,5] → keep 0 (earlier), drop 5 (oob).
        async def llm(s, u, j):
            return ('{"plan":[{"role":"retriever","subtask":"a","deps":[1]},'
                    '{"role":"reasoner","subtask":"b","deps":[0,5]}]}')
        plan = await plan_subtasks("t", make_io(Recorder(), llm=llm))
        self.assertEqual(plan[0]["deps"], [])       # forward dep dropped (acyclic)
        self.assertEqual(plan[1]["deps"], [0])      # earlier kept, out-of-range dropped

    async def test_dep_remap_survives_filtered_invalid_role(self):
        # a bad-role item at index 0 gets filtered; the reasoner's dep [1] must remap to the
        # retriever's NEW index 0 — not dangle or point at the wrong item.
        async def llm(s, u, j):
            return ('{"plan":[{"role":"nope","subtask":"x"},'
                    '{"role":"retriever","subtask":"a"},'
                    '{"role":"reasoner","subtask":"b","deps":[1]}]}')
        plan = await plan_subtasks("t", make_io(Recorder(), llm=llm))
        self.assertEqual([p["role"] for p in plan], ["retriever", "reasoner"])
        self.assertEqual(plan[1]["deps"], [0])      # dep remapped through the filter

    async def test_dependent_specialist_sees_upstream_finding(self):
        seen = {}

        async def fake_llm(system, user, json_mode):
            if json_mode and "plan" in system:
                return ('{"plan":[{"role":"retriever","subtask":"找证据"},'
                        '{"role":"reasoner","subtask":"据此分析","deps":[0]}]}')
            if json_mode and "质检员" in system:
                return '{"notes":""}'
            if "推理顾问" in system:
                seen["reasoner_user"] = user
            return "ok"

        async def fake_retrieve(q):
            return "RETRIEVED-FACT-42"

        rec = Recorder()
        await run_orchestrator("任务", make_io(rec, llm=fake_llm, retrieve=fake_retrieve))
        # the reasoner ran AFTER the retriever and saw its finding injected as context
        self.assertIn("RETRIEVED-FACT-42", seen.get("reasoner_user", ""))


if __name__ == "__main__":
    unittest.main()
