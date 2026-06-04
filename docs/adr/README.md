# Architecture Decision Records

Load-bearing decisions, so future reviews don't re-litigate them. If an architecture review
re-suggests something settled here, the ADR wins — or it gets reopened with a load-bearing
reason and a new ADR supersedes it.

Format per record: **Status · Context · Decision · Consequences.** Keep them short.

| ADR | Decision | Status |
|-----|----------|--------|
| [0001](./0001-backend-language-python.md) | Backend in Python; two-language boundary (no Go) | Accepted |
| [0002](./0002-orchestration-on-cloud-run.md) | Long orchestration on Cloud Run, not the edge function | Accepted |
| [0003](./0003-api-key-isolation.md) | Key isolation; Priority-4 fallback gated; shared keys = platform scope | Accepted |
| [0004](./0004-ab-study-and-epistemic-agency.md) | A/B study design + epistemic-agency guardrail | Accepted |

To add one: copy the format, number it next in sequence, link it in the table.
