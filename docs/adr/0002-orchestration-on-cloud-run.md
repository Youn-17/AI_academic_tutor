# ADR-0002 — Long orchestration on Cloud Run, not the edge function

**Status:** Accepted (2026-06)

## Context

The multi-agent **orchestrator** (lead plans → specialists run in parallel → critic → synth)
makes 5–7 LLM calls per query. Run inside the Supabase **edge function**, a rich run approached
the **~150s wall-clock limit**; the non-streamed synthesis once got cut off, producing an empty
reply. The edge function is the right home for *interactive* turns (one agent, a few tool
rounds) but not for minutes-long autonomous orchestration.

## Decision

- **Interactive turns** (< ~150s): stay in the **edge function** (TypeScript/Deno). Mitigate
  long runs by streaming the synthesis live and trimming the pipeline.
- **Long-running orchestration**: move to the **Cloud Run backend** (Python/FastAPI), which has
  no wall-clock cap (timeout configurable to 3600s) and can run parallel sub-agents natively.
  Consolidate it with the existing code-interpreter service.

## Consequences

- The edge-fn orchestrator remains as the interactive fallback; the backend orchestrator is the
  path for deep/long research-team runs.
- The backend resolves the AI key + runs the planner/specialists/critic/synth; the edge function
  stays the thin entry for interactive chat.
- Never "fix" the 150s limit by fighting the edge runtime — that's a platform constraint; the
  answer is *where it runs*, not *what language*.
