# 02 · Projects read path
**Who:** both · **Depends on:** card 01 · **Estimate:** M

## Goal
`GET /api/v1/requisitions/projects` and `GET /api/v1/requisitions/projects/:id` return real,
server-computed project data. The Projects tab — Pipeline/Board/List across the four lifecycle
buckets — and the Projects drawer render from the API instead of the in-memory seeds in `data.ts` /
`registry.ts`, and every number on screen matches what's there today.

## Where it shows in the UI
`src/modules/requisitions/projects-tab.tsx` (Pipeline · Board · List, four lifecycle buckets, each
project's one-line "next action") and `project-detail.tsx` (the drawer: money → next action →
lifecycle block [set up / month timeline / close out / archived] → contacts → billing settings →
notes → documents → activity).

## Backend
**Tables** (`backend/prisma/schema/requisitions.prisma`):
- Reuse the **existing `Project`** model — `contractValue`, `retainagePercent`, `paymentTerms`,
  `gcId`, `leadPMId`, `jobNumber`/`contractNumber` already exist. The prototype's `owner` = your
  `leadPM`.
- New **`ProjectBilling`** (1:1 with `Project`): `lifecycle` enum `ONBOARDING · ACTIVE ·
  FULLY_BILLED · ARCHIVED`; `channel` enum `EMAIL · TEXTURA · SITELINE · PROCORE`; `startRule`
  (`SECOND_MONDAY · FIRST_OF_MONTH · DAY_OF_MONTH` + `startDay Int?`); `dueDay Int`;
  `internalLeadDays Int`; `netDays Int` (default from `paymentTerms` — add `NET_75`/`NET_90` to that
  enum if it's missing them); `notes Text?`; `priorBilledThrough String?` ("YYYY-MM");
  `priorBilled/priorPaid/priorRetentionHeld Decimal(15,2)?`; `priorNote String?`; `archivedAt
  DateTime?`. Do **not** duplicate retainage here — it stays on `Project.retainagePercent`.
- New **`ProjectBillingContact`**: `{ projectId, contactId, routes String[] }`, routes ∈
  `REQUISITION · CHANGE_ORDER · DOCUMENTS · PAYMENT`, `@@unique([projectId, contactId])`, linking to
  the existing directory `Contact`. Card 08 builds the write endpoints for this; this card only needs
  the read join (drawer's contact list, and the "submit-to contact" onboarding check below).

**Endpoints** (mount at `/api/v1/requisitions`):
- `GET /projects?lifecycle=&q=` — reproduces `allProjectSnapshots()` + `lifecycleCounts()` from
  `registry.ts`. Compute server-side, don't just pass through rows: financials, `thisMonth`,
  `openReqs`, `daysLate`, docs summary, onboarding steps, closeout, `nextAction`, `urgency`. Returns
  `ProjectSnapshot[]` + the lifecycle counts.
- `GET /projects/:id` — reproduces `projectSnapshot()` + `monthTimeline()` + `projectActivity()`.
  Return the snapshot plus timeline rows and activity (or split into `/timeline` and `/activity`).

**Money math** (`projectFinancials()`, `registry.ts` — port exactly, round every dollar figure to 2
decimals):
```
originalContract = contractValue
approvedCos       = Σ approved BillingChangeOrder.amount for the project   (0 until card 06 — fine)
currentContract   = originalContract + approvedCos
newBilled         = Σ amount of non-retention reqs at stage ∈ {final, approved, paid}
billedToDate      = priorBilled + newBilled
paidToDate        = priorPaid + Σ amount of non-retention reqs at stage = paid
retentionBilled   = Σ amount of retention-bill reqs not in draft
retentionHeld     = max(0, priorRetentionHeld + newBilled × retainagePct/100 − retentionBilled)
outstanding       = max(0, (priorBilled − priorPaid) + Σ amount of ALL reqs at stage ∈ {final, approved})
leftToBill        = max(0, currentContract − billedToDate)
pctBilled         = currentContract > 0 ? min(100, round(billedToDate/currentContract × 1000)/10) : 0
```
Requisition/CO tables don't exist until cards 03/06 — for now this reads 0 requisitions and 0 approved
COs, so most projects will show $0 billed. That's expected; the shape must be exact so the numbers
self-correct once those cards land.

**Onboarding** (`onboardingSteps()`, six booleans, each with a `goTo` tab target the UI uses):
```
gc           = project.gc is set AND it has ≥1 contact
forms        = DocRequirement count for the project > 0        (0 until card 05 — fine)
sov          = Sov.status === APPROVED                          (undefined until card 07 — fine)
team         = project.owner (leadPM) is set
submitTo     = any contact routed 'requisition'
startBilling = any Requisition for the project with stage != draft   (false until card 03 — fine)
```

**Next action / urgency** — port `nextActionFor()` (`registry.ts` lines ~240–290) exactly; it's a
priority list, not independent conditions: `archived` → "Archived {date}"; `onboarding` → next
incomplete step's label, or "Ready — start billing"; `fullyBilled` → the closeout step's label +
detail; `active` → the first of: days-late chase-payment line → past-due-docs line → this month's
requisition-stage line → "not billing this month" line → expired-one-time-docs line → "Start {month}
requisition" line. Urgency is one of `late · due · ok · idle`.

## Frontend
- `api/projects.api.ts` — `list(filters?)`, `get(id)`. Same shape as
  `src/modules/catalog/api/costcodes.api.ts` (axios instance from `@/app/api`, Zod
  `.parse(res.data?.data ?? res.data)`).
- `schemas/project.schema.ts` — Zod versions of `Project`, `ProjectSnapshot`, `ProjectFinancials`,
  `OnboardingStep`, `MonthRow`, `ActivityEntry` (from `data.ts`/`registry.ts`); derive TS types with
  `z.infer`.
- `constants/requisitions.keys.ts` — start `requisitionsKeys`: `all`, `projects()`, `project(id)`.
- `hooks/use-projects.ts` — `useProjectsQuery(filters?)`, `useProjectQuery(id)` using React Query v5
  object form (`.claude/rules/data-fetching.md`).
- Swap `projects-tab.tsx` and `project-detail.tsx` off `allProjectSnapshots()`, `lifecycleCounts()`,
  `projectSnapshot()`, `monthTimeline()`, `projectActivity()` onto the new hooks. Add loading / error /
  empty states per `.claude/rules/ui-quality.md`.

## Done when
- [ ] `GET /api/v1/requisitions/projects` returns 8 projects with `lifecycleCounts` = 2 onboarding
      (489 State Street, PS 508Q), 6 active (Hollis, Boyland, Sinai, DCAS, Hip Hop, Success Academy),
      1 fully billed (Kings), 1 archived (JFK T6)
- [ ] The Projects tab shows the same four buckets and the same next-action line per project as the
      current mock (module state permitting — dollar totals will read $0 until later cards land)
- [ ] Opening the Hollis drawer shows KPIs, onboarding steps, month timeline, and activity sourced
      from the API, not from `data.ts`
- [ ] Network tab shows zero calls into `data.ts`/`registry.ts` selectors from these two components

## Don't
- Change tab order, view order, lifecycle bucket order/names, or drawer section order — fixed per
  `real-vs-mock.md`.
- Duplicate `retainagePct` onto `ProjectBilling`.
- Rename any exported type from `data.ts` / `registry.ts` — both sides key off them (`.claude/rules/requisitions-module.md`).

## See also
`../contract.md` § 1 "Tables" (Project / ProjectBilling / ProjectBillingContact rows), § 2 "Endpoints
› Projects (registry)", the Financials/Onboarding definitions near the end, § 4 "Order of work" item 1.
