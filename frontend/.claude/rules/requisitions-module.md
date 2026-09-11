---
paths:
  - "src/modules/requisitions/**"
  - "src/modules/email/requisitions/**"
---

# Requisitions module — rules for AI coding agents

The UI in `src/modules/requisitions/` is **approved by Peter Ligas (ELLI NY Design Corp)** and is the spec.
The job here is to put a real backend under it, not to change what it does.
Handoff docs: `docs/handoff/README.md` → `real-vs-mock.md` → `contract.md` → `tasks/`.

## Do not
- Redesign screens, rename tabs / stages / views, change colors, move sections, or "improve" wording.
  Tab order: **Projects · SOV · Requisitions · Change Orders · Documents**. Views on every tab:
  **Pipeline (default) · Board · List** — Documents defaults to List.
- Rename or remove any exported type in `data.ts` / `stages.ts` / `registry.ts`. Frontend and backend both key off them.
- Delete the seed data. It is the demo Peter reviews against — move it to the backend seeder.
- Turn the past-due flag into a stored field. It is computed (`reqAging`); only `hold` is manual.
- Loosen the document gate: a requisition cannot go to Final while a monthly document for that month is not Filed.

## Do
- Treat `data.ts` + `registry.ts` as the behavior spec. Port the math exactly — `saveReqLinePcts`,
  `projectFinancials`, `reqAging`, `closeoutFor`, `onboardingSteps`, `docsSummaryFor`,
  `billingDatesForMonth`, `deriveTasksFromRequisitionsModule`. Endpoint/table mapping: `docs/handoff/contract.md`.
- Replace in-memory reads/mutations with `api/*.api.ts` + Zod `schemas/` + React Query `hooks/` per the
  other rules in this folder. The `window 'reqs-changed'` event becomes query invalidation.
- Keep every component and file name. Add loading / error / empty states per `ui-quality.md`.
- `todayIso()` is a demo clock pinned to 2026-07-13 (the mailbox has its own, 2026-07-07). Replace both with the real clock.
- Contact emails in seeds end in `.example` on purpose. Never commit real ones.
- When something cannot work as built, say so on the GitHub issue before changing it.
