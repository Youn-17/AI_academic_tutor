# Shared Language — techedu.icu

The ubiquitous language of this project. Name variables, functions, and modules with these
terms; use them in code, commits, ADRs, and conversation. Consistency is the point — don't
drift into synonyms ("component", "service", "boundary"). New term coined during a change?
Add it here in the same commit.

## Domain

- **Student** — a learner. Sender role `student`. Chats with the tutor to *think*, not to be answered.
- **Supervisor** — a teacher. Sees student chats, can intervene, configures keys, exports research data. `profiles.role` ∈ `supervisor`/`admin`.
- **Condition** — the A/B study assignment in `study_participants.condition`:
  - **A_direct** — clean control: direct prompt, **no RAG, no tools/agent**.
  - **B_socratic** — treatment: Socratic prompt + RAG + the tool-using agent.
  - `null` — non-participant; same capabilities as B_socratic, free to pick any role.
- **Agent role** — a selectable tutor persona (`src/services/AgentRoles.ts`): socratic, debate,
  metacog, paperfeedback, course-tutor, explainer, quizzer, **affective**. A role is a *system
  prompt*, not a separate agent. All share the same toolset.
- **EPISTEMIC_GUARDRAIL** — the non-negotiable rules every role inherits: scaffold, cite, don't
  write gradeable work, don't foster dependency, defer to the supervisor.
- **Tool** — a capability the agent invokes: `search_knowledge_base`, `deep_search`, `run_python`,
  `web_search`, `recall_memory`, `save_memory`.
- **Knowledge base (KB)** — the RAG corpus (textbooks + papers), `match_chunks` over pgvector.
- **Turn** — one student message + the streamed AI reply, persisted and research-logged together.
  Implemented by the **`streamAndPersistTurn`** module.
- **Orchestrator / Research team** — the multi-agent mode: a **lead** plans → **specialists** run
  in parallel → a **critic** reviews → the lead **synthesizes**. Triggered by the `team` flag.
- **Specialist** — a sub-agent in the orchestrator, positioned by the Liu et al. (2026) role
  taxonomy: **retriever** (cognitive-epistemic), **analyst** (run_python), **reasoner**
  (self-regulatory), **affective** (socio-emotional), **web**.
- **Code interpreter** — the Cloud Run + E2B sandbox that runs LLM-written Python (`run_python`).
- **Research event** — one row in `research_events`: an ordered, codeable interaction event
  (`student_query` / `ai_response` / `tool_invoked` / `role_switched` / …) keyed to a participant,
  session, and condition. The substrate for ENA / sequence analysis.
- **Research export** — the anonymized tidy-CSV + codebook bundle (`export_research_bundle` RPC →
  `ResearchExport.ts`), built for special-issue analysis.

## Architecture (use these, per the deep-modules principle)

- **Module** — anything with an interface and an implementation.
- **Interface** — everything a caller must know: types, invariants, error modes, ordering, config.
- **Depth** — leverage at the interface. **Deep** = lots of behaviour behind a small interface.
  **Shallow** = interface nearly as complex as the implementation (a pass-through).
- **Seam** — where an interface lives; a place behaviour can be swapped without editing in place.
  The unit of testing.
- **Deletion test** — imagine deleting the module. Complexity vanishes → it was a pass-through.
  Complexity reappears across N callers → it earned its keep.
- **Edge function** — a Supabase Deno handler (TS). The interactive path. ~150s wall-clock cap.
- **Backend** — the Cloud Run FastAPI service (Python). Long-running compute, no wall-clock cap.
