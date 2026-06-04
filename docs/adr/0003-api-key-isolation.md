# ADR-0003 — API-key isolation; Priority-4 fallback gated; shared keys = platform scope

**Status:** Accepted (2026-06)

## Context

AI provider keys live in `ai_api_configs`, resolved by a cascade: (1) the student's class key →
(2) their own key → (3) a `platform`-scoped key → (4) **any active key for the provider**. A
security audit found tier (4) lets an **un-enrolled student pull any teacher's class-scoped
key** (cross-tenant quota theft). But simply removing tier (4) would break the platform: the
shared `dmxapi` (default chat) and `zhipu` (vision) keys were stored as `scope=class` with a
`null` class_id — orphans that *only* resolved via tier (4).

## Decision

- Tier (4) "any active key" is **gated behind the `PILOT_OPEN_KEYS` env flag (default off)**.
  It is cross-tenant by design and is enabled only for an explicit open single-class pilot.
- **Shared platform keys** (the default `dmxapi`, `zhipu`) are stored as **`scope=platform`** so
  they resolve legitimately via tier (3) for everyone.
- A **teacher's class key** (a real `class_id`) serves only that class via tier (1).

## Consequences

- No cross-tenant key leak with the flag off (the secure default).
- Shared platform keys serve all students; teacher class keys serve their enrolled students.
- Keys are still stored **plaintext** (RLS-protected) — encryption-at-rest is a separate backlog
  item before scaling past a handful of teachers.
