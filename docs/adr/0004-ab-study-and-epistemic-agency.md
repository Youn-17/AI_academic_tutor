# ADR-0004 — A/B study design + epistemic-agency guardrail

**Status:** Accepted (2026-06)

## Context

The platform is the deployment study behind an *npj Science of Learning* paper on protecting
student **epistemic agency**. The core comparison is Socratic guidance vs. direct answers, and
the construct under study is whether the tutor fosters independent thinking or dependency.

## Decision

- **Condition** (`study_participants.condition`) gates capability, in one place per turn:
  - **A_direct** — clean control: direct system prompt, **no RAG, no tools/agent**, role picker locked.
  - **B_socratic** — treatment: Socratic prompt + RAG + the tool-using agent.
  - `null` (non-participant) — same capabilities as B_socratic; free to pick any role.
- Every agent role inherits the **`EPISTEMIC_GUARDRAIL`**: scaffold rather than answer, cite
  sources, never write gradeable artifacts, flag uncertainty, defer to the supervisor.
- The orchestrator's synthesizer carries the same guardrail.

## Consequences

- New features **must not leak into `A_direct`** — it is the experimental control. Capability
  changes are gated on `condition` and verified against this rule.
- Interaction data is captured as ordered `research_events` (condition snapshot included) so the
  study can analyze agency/sequence, not just outcomes.
- The guardrail is a product *and* research invariant: weakening it changes what the study measures.
