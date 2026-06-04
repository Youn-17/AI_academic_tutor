# ADR-0001 — Backend in Python; two-language boundary (no Go)

**Status:** Accepted (2026-06)

## Context

The platform's compute is **I/O-bound glue**: it mostly waits on LLM APIs (DMXAPI), Postgres,
vector search, and E2B. Heavy work is outsourced. For this workload, language choice has
~zero effect on performance (network-bound, not CPU-bound). The real bottleneck hit in practice
was the Supabase edge **150s wall-clock limit** — a platform limit, not a language limit
(see ADR-0002). Go was considered; its advantages (massive concurrency, low cost-per-request,
single binary) only matter at productized scale with many concurrent long sessions. This is a
**research pilot** (npj Track-B study, a class or two), maintained by **one Python-fluent
researcher**.

## Decision

Two languages, on purpose:
- **TypeScript** — the interactive edge + frontend (Deno edge functions, React/Vite). Co-located
  types, serverless.
- **Python** — backend compute (Cloud Run FastAPI: code-interpreter + the orchestrator) and the
  entire research/data pipeline.

No Go. Adding a third language would fragment a one-person codebase for no payoff at this scale.

## Consequences

- The L3 orchestration backend is built in **Python/FastAPI + asyncio**, consolidated with the
  code-interpreter service (one backend language).
- Reassess only if the platform productizes to thousands of concurrent users *and* the
  orchestration backend becomes a measured concurrency/cost bottleneck — and even then, rewrite
  only the hot path, not the stack.
- The research pipeline (export → ENA / sequence analysis / LLM coding with κ) stays in Python's
  ecosystem, aligned with the researcher's fluency and the data-science tooling.
