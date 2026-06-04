# Engineering Charter — techedu.icu

> First principles for this codebase. Read this before changing anything.
> Shared language lives in [CONTEXT.md](./CONTEXT.md); load-bearing decisions in [docs/adr/](./docs/adr/).

## Mission (why this exists)

techedu.icu is a **research instrument first, a product second**. It is the deployment-study
platform behind an *npj Science of Learning* paper: a research-grounded **Socratic tutor that
protects student epistemic agency**. Every feature serves one of two ends — **helping students
think** (not handing them answers) or **producing analysis-ready research data**. When a choice
trades product polish against either of those, the research end wins.

## Engineering first principles

These are not style preferences. They are how we keep a one-person research codebase from
rotting into mud.

1. **Deep modules over shallow wrappers.** A good module hides a lot of behaviour behind a
   small interface (high *leverage*). Before adding a function, apply the **deletion test**:
   if deleting it just moves code around, it was a pass-through — inline it. If deleting it
   makes complexity reappear across many callers, it earns its keep. (e.g. `streamAndPersistTurn`
   is one deep module both send and edit drive; `extractJSON` is one helper that replaced three
   fragile copies.)

2. **The interface is the test surface — build seams.** Code is testable when behaviour can be
   altered at a seam without editing in place. Pure functions with explicit inputs→outputs
   (`extractJSON`, the planner/specialist/synth steps) are the units we test. Inline `fetch` +
   DB + business logic with no injectable boundary is the anti-pattern.

3. **Grill before you build.** Most failures are misalignment, not bad code. Before a
   non-trivial change, interrogate the requirement (`/grill-me`, `/grill-with-docs`) until the
   design tree is resolved. Sharpen fuzzy terms into [CONTEXT.md](./CONTEXT.md) as you go.

4. **Feedback loops are the speed limit.** Take small, verifiable steps. `vite build` OOMs
   locally, so the local gate is a single-file **esbuild** syntax check; types + tests are the
   other loops. Prefer red-green-refactor (`/tdd`) for backend logic that can be unit-tested.

5. **Fail closed.** Security and auth default to *deny*. No unverified token decode, no
   cross-tenant key reuse, no world-readable data unless an ADR says so. Privacy: research
   exports are anonymized; **secrets never enter git** (see below).

6. **No spaghetti — and don't "fix" what isn't broken.** Don't duplicate; consolidate. Don't
   add a band-aid when the root cause is one layer down. And when an audit flags a "bug",
   *verify it's real before touching it* — changing correct code is how mud starts. (We dropped
   3 false-alarm "fixes" in the last audit for exactly this reason.)

7. **Record decisions, don't re-litigate them.** Load-bearing choices live as ADRs in
   [docs/adr/](./docs/adr/). If a review re-suggests something an ADR already settled, the ADR
   wins (or gets reopened with a load-bearing reason).

## Architecture boundary (settled — see ADR-0001/0002)

Two languages, on purpose. Adding a third (e.g. Go) would fragment a solo research codebase
for no payoff at this scale.

- **TypeScript** — the interactive edge + frontend. React/Vite (Vercel) and Supabase **Deno
  edge functions** (the chat agent, short interactive turns). Co-located types, serverless.
- **Python** — the backend compute + all research work. Cloud Run **FastAPI** (code-interpreter
  → E2B; the long-running multi-agent **orchestrator**), and the data pipeline (export → ENA /
  sequence analysis / LLM discourse coding with κ). The researcher's home turf.

**Where things run:** interactive turns (< ~150s) stay in the edge function. Long-running
orchestration goes to **Cloud Run** (no wall-clock cap) — never fight the edge 150s limit.

## Non-negotiables

- **Never commit secrets.** `.env`, `.env.local`, `.mcp.json` are gitignored and hold the only
  copies (Supabase tokens, anon key, provider keys). Internal planning/ops docs are gitignored
  too. The repo is **public** — scan before you push.
- **Protect epistemic agency.** Agents scaffold, cite sources, and flag uncertainty; they do
  not write gradeable artifacts or foster dependency (see the `EPISTEMIC_GUARDRAIL`).
- **A/B integrity.** `A_direct` is the clean control (no tools, no RAG, direct prompt). Don't
  let new features leak into it (see ADR-0004).

## How to work here (ops)

- **Validate frontend**: single-file `esbuild --bundle` syntax check (vite build OOMs locally).
- **Deploy edge fn**: `supabase functions deploy chat --use-api` via CLI (retry through OOM-137);
  boot-test `POST` with anon key → expect **401** (healthy), 503 = broken. Never PATCH-body deploy.
- **Deploy backend**: push to `code-interpreter/**` → GitHub Actions auto-deploys to Cloud Run.
- **Schema**: applied via the Supabase Management API (migration history is out of sync — do
  **not** `db push`). New objects should also be backfilled into `supabase/migrations/` (ADR-0006).
