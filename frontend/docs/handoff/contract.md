# Requisitions module — data + API contract

This is the map from the working prototype to your stack. The UI is done and approved;
your job is to put a real backend under it without changing what the screens do.

- **Source of truth for behavior:** `src/modules/requisitions/data.ts` (types, seeds, mutations, derived tasks)
  and `src/modules/requisitions/registry.ts` (derived project-level aggregates).
  Every function there is a row below. Port the math as-is — the numbers on screen were verified by Peter.
- **Your conventions apply:** Bun + Hono + Prisma (4-file modules, `success()`/`failure()`, ULIDs, S3 files,
  ActivityLog) on the backend; `api/*.api.ts` + Zod `schemas/` + React Query `hooks/` + `constants/` keys on the frontend.
- **"today"** in the prototype is pinned to `2026-07-13` (`todayIso()`). Replace with the clock.

---

## 1. Tables (new `backend/prisma/schema/requisitions.prisma`)

Reuse what you have where it fits; add only what is missing.

| Prototype type (`data.ts`) | Your model | Notes |
|---|---|---|
| `Project` — id, name, gc, gcProjectNumber, contractValue, paymentTerms, owner | **existing `Project`** | `contractValue`, `retainagePercent`, `paymentTerms`, `gcId`, `leadPMId`, `jobNumber`/`contractNumber` already exist. `owner` = `leadPM`. |
| `Project.lifecycle · billing · notes · priorBilling · channel · archivedAt` | **new `ProjectBilling`** (1:1 with `Project`) | `lifecycle` enum `ONBOARDING · ACTIVE · FULLY_BILLED · ARCHIVED`; `channel` enum `EMAIL · TEXTURA · SITELINE · PROCORE`; `startRule` (`SECOND_MONDAY · FIRST_OF_MONTH · DAY_OF_MONTH` + `startDay Int?`), `dueDay Int`, `internalLeadDays Int`, `netDays Int` (derive default from `paymentTerms`; enum needs `NET_75`/`NET_90` if absent); `notes Text?`; `priorBilledThrough String?` ("YYYY-MM"), `priorBilled/priorPaid/priorRetentionHeld Decimal(15,2)?`, `priorNote String?`; `archivedAt DateTime?`. Keep `retainagePct` on `Project.retainagePercent` (do not duplicate). |
| `GcContact` — name, role, email, phone, `routes[]` | **existing `Contact`** + **new `ProjectBillingContact`** | Routing is per project, not per GC: `ProjectBillingContact { projectId, contactId, routes String[] }` with routes ∈ `REQUISITION · CHANGE_ORDER · DOCUMENTS · PAYMENT`. `@@unique([projectId, contactId])`. |
| `Sov` — rev, status, source, groups, lines, sentAt, approvedAt, file | **new `Sov`**, `SovGroup`, `SovLine` | `Sov { projectId, rev Int, status enum DRAFT·SENT·MARKED_UP·RESUBMITTED·APPROVED, source enum EXCEL_UPLOAD·BUILT_IN_APP, fileId? → File, sentAt?, approvedAt? }`; `SovLine { sovId, groupId?, code, description, scheduled Decimal(15,2), sort Int }`. One approved SOV per project at a time; new rev on each Sent. |
| `Requisition` — month, seq, amount, pctComplete, linePcts, lineStored, storedTotal, retainagePct, stage, flags, file, isRetentionBill, paidVia | **new `Requisition`** + **`RequisitionLine`** | `Requisition { projectId, month String "YYYY-MM", seq Int, stage enum DRAFT·PENCIL·RETURNED·FINAL·APPROVED·PAID, amount Decimal(15,2), pctComplete Decimal(5,1)?, storedTotal Decimal(15,2)?, retainagePct Decimal(5,2)?, hold Boolean, isRetentionBill Boolean, paidVia enum CHECK·ACH·TEXTURA·PROCORE?, fileId? → File }` `@@unique([projectId, month, isRetentionBill])`. `RequisitionLine { requisitionId, sovLineId, pct Decimal(5,1), stored Decimal(15,2) }` `@@unique([requisitionId, sovLineId])`. **`pastDue` is computed, never stored** (see aging). |
| `ReqHistoryEntry` / `SovHistoryEntry` / `CoHistoryEntry` | **existing `ActivityLog`** | `entityType` = `requisition` / `sov` / `billingChangeOrder`, `action` = the new stage/status, `note` = cause. `projectActivity()` = ActivityLog for every entity of the project, newest first. |
| `SkippedMonth` | **new `SkippedMonth`** | `{ projectId, month, reason?, createdBy }` `@@unique([projectId, month])`. Creating a requisition for that month deletes the row. |
| `DocRequirement` — owner, vendorName, form, order, cadence | **new `DocRequirement`** | `owner enum US·VENDOR`, `vendorId? → Vendor` (prototype uses `vendorName` text), `form String`, `sort Int`, `cadence enum MONTHLY·ONE_TIME`. |
| `DocRecord` — month, status, filedAt, fileUri, sourceEmailId, expiresOn | **new `DocRecord`** | `status enum MISSING·RECEIVED·FILED`, `fileId? → File`, `expiresOn DateTime?` (one-time only). Monthly: `@@unique([requirementId, month])`. One-time: many records, newest filed wins (`latestOneTimeRecord`). |
| `ChangeOrder` (Elli → GC) — number, gcNumber, title, trigger, triggerRef, status, amount, daysAdded, dates, approvedBy, file, linkedReqId | **new `BillingChangeOrder`** | Your `PrimeChangeOrder` is the Fieldwire mirror (`fieldwireId` required) — not the same object. Add `primeChangeOrderId? → PrimeChangeOrder` so a billing CO can point at its Fieldwire twin when one exists. `status enum DRAFT·SUBMITTED·IN_REVIEW·PARTIALLY_EXECUTED·APPROVED·REJECTED`, `trigger enum ASI·FIELD_MOD·AWP·OWNER_DIRECTIVE·CODE·VE`, `amount Decimal(15,2)` (negative = deduct), `daysAdded Int?`, `fileId? → File`. |
| `Photo` | **new `Photo`** | `{ projectId, category enum, month?, caption, takenAt, fileId → File, linkedRequirementId? }`. |
| Real files (`/public/reqs/**.xlsx`, `*.pdf`) | **existing `File`** (S3) | Same attachment pattern as `POAttachment` etc. |

---

## 2. Endpoints (mount at `/api/v1/requisitions`)

Your REST rules: `GET` list/`:id`, `POST` create, `PUT` update (id in body), `PATCH /{resource}/{action}`, `DELETE :id` (soft).
Each row names the prototype function whose behavior the endpoint must reproduce.

### Projects (registry)
| Method + path | Prototype | Returns / does |
|---|---|---|
| `GET /projects?lifecycle=&q=` | `allProjectSnapshots()`, `lifecycleCounts()` | `ProjectSnapshot[]` + counts. **Compute server-side** (`registry.ts`): financials, thisMonth, openReqs, daysLate, docs summary, onboarding steps, closeout, `nextAction`, `urgency`. |
| `GET /projects/:id` | `projectSnapshot()`, `monthTimeline()`, `projectActivity()` | Snapshot + timeline rows + activity (or split into `/timeline` and `/activity`). |
| `PATCH /projects/:id/lifecycle` `{lifecycle}` | `setLifecycle()` | Sets `archivedAt` when ARCHIVED. |
| `PUT /projects/:id/billing` `{retainagePct?, startRule?, startDay?, dueDay?, internalLeadDays?, netDays?, notes?, channel?}` | `setRetainagePct()`, `setBillingSchedule()`, `setProjectNotes()` | |
| `POST /projects/:id/contacts` `{contactId | {fullName, role, email, phone}, routes}` | `addContact()` | Link an existing directory Contact or create one under the project's GC. |
| `PATCH /projects/:id/contacts/route` `{contactId, route}` | `toggleContactRoute()` | |
| `DELETE /projects/:id/contacts/:contactId` | `removeContact()` | Unlink only; never deletes the directory contact. |

### SOV
| Method + path | Prototype | Returns / does |
|---|---|---|
| `GET /sov?projectId=` | `getSov()`, `sovTotal()` | Current rev with groups + lines + file. |
| `POST /sov` (multipart) | (file card on SOV tab) | Upload the GC's Excel → `File`; parse lines server-side if you want them editable in-app (`source = EXCEL_UPLOAD`), else store the file only. |
| `PATCH /sov/:id/status` `{status, note?}` | SOV history entries | `SENT → MARKED_UP → RESUBMITTED → APPROVED`; `SENT` bumps `rev`. |

### Requisitions
| Method + path | Prototype | Returns / does |
|---|---|---|
| `GET /?month=&projectId=` | `REQUISITIONS`, `getReqsForMonth()`, `getAllReqsSortedByMonthDesc()`, `monthsOnFile()` | Include per-req `aging` (below) and `effectiveFlags`. |
| `GET /:id` | `getReq()`, `getRecordsForReq()`, `missingDocsForReq()`, `reqAging()` | Req + its lines + the document checklist for its month (one-time docs use the latest valid record). |
| `POST /` `{projectId, month}` | `createDraftReq()` | Next `seq`; deletes the SkippedMonth row if any; if project is ONBOARDING nothing changes until first PENCIL. |
| `POST /retention` `{projectId}` | `createRetentionBill()` | Amount = current `retentionHeld` (financials). One per project. |
| `PUT /:id/lines` `{lines:[{sovLineId, pct, stored}]}` | `saveReqLinePcts()` | **Port this math exactly:** `amount = Σ scheduled × max(0, pct − priorPct)/100 + Σ (stored − priorStored)`; `pctComplete = Σ(pct × scheduled)/Σ scheduled`; `storedTotal = Σ stored`. `priorPct`/`priorStored` = the most recent earlier requisition's value for that line (`priorLinePct`, `priorLineStored`). |
| `PATCH /:id/stage` `{stage, cause?}` | `advanceReqStage()` | Server enforces the same gate the UI has: `→ FINAL` refused while monthly docs for that month are not FILED. First non-DRAFT stage on an ONBOARDING project flips it to ACTIVE. Writes ActivityLog. |
| `PATCH /:id/hold` | `toggleReqFlag('hold')` | The only manual flag. |
| `PATCH /:id/paid` `{via}` | `markReqPaid()` | Stage → PAID + `paidVia`. |
| `POST /skipped-months` `{projectId, month, reason?}` / `DELETE /skipped-months/:id` | `skipMonth()`, `unskipMonth()` | Refuse when a requisition exists for that month. |

**Aging** (`reqAging()` — compute on read, return with every requisition):
`submittedOn` = first ActivityLog `FINAL` (fallback `APPROVED`); `dueOn = submittedOn + netDays`; `daysLate = max(0, today − dueOn)` only while stage ∈ {FINAL, APPROVED}; `predictedPaidOn = submittedOn + avgDaysToPaid(project)` (average of submitted→paid over this project's PAID reqs; fallback `dueOn`). `effectiveFlags = manual hold + (daysLate > 0 ? pastDue)`.

### Documents
| Method + path | Prototype | Returns / does |
|---|---|---|
| `GET /documents/requirements?projectId=` | `getRequirementsForProject()` | |
| `POST /documents/requirements` `{projectId, owner, form, vendorId?, cadence}` / `PUT` (cadence) / `DELETE /:id` | `addRequirement()`, `setRequirementCadence()`, `removeRequirement()` | |
| `GET /documents/records?projectId=&month=` | `DOC_RECORDS`, `latestOneTimeRecord()` | |
| `PATCH /documents/records/file` `{requirementId, month, projectId, fileId}` | `markDocFiled()` | Monthly: upsert `(requirementId, month)` → FILED. One-time: insert a new record, `expiresOn = today + 365d` unless given. |
| `GET /documents/summary?projectId=` | `docsSummaryFor()` | open / past-due monthly (past due = month's `gcDue` < today on reqs at PENCIL·RETURNED·FINAL), one-time valid/missing/expiring-soon (≤ 30 d), next expiry. |

### Change orders (Elli → GC)
| Method + path | Prototype | Returns / does |
|---|---|---|
| `GET /change-orders?projectId=` | `getChangeOrdersForProject()`, `getApprovedCoValueForProject()`, `getPendingCoValueForProject()` | |
| `POST /change-orders` `{projectId, title, trigger, triggerRef?, amount, daysAdded?}` | `createDraftCo()` | Number = `CO#` + next per project, zero-padded 3. |
| `PATCH /change-orders/:id/status` `{status, note?}` | `advanceCoStatus()` | `APPROVED` sets `dateApproved`; approved amounts add to `currentContract` everywhere (`contractValue + approvedCos`). |
| `POST /change-orders/:id/file` (multipart) | CO PDF card | |

### Photos, tasks
| Method + path | Prototype | Returns / does |
|---|---|---|
| `GET /photos?projectId=&category=` / `POST /photos` (multipart) | `getPhotosForProject()` | |
| `GET /tasks` | `deriveTasksFromRequisitionsModule()` | The requisitions@ mailbox Tasks board reads this. Five card types: pencil due (project calendar: `gcDue − internalLeadDays`), returned → revise, missing doc → collect (one per doc), past terms → chase payment (aging; names the PAYMENT-route contact), nothing started this month → start (active projects only; a SkippedMonth clears it). Card ids are deterministic (`req:{id}:pencil-due` …) so cards disappear when the condition clears. |

**Billing calendar** (`billingDatesForMonth()`): `start` = 2nd Monday / 1st / day N; `gcDue` = `dueDay` clamped to month length; `internalDue = gcDue − internalLeadDays`.

**Financials** (`projectFinancials()` — gross of retainage, the way the team reads a G702): `currentContract = contractValue + approvedCOs`; `billedToDate = priorBilled + Σ progress reqs at FINAL/APPROVED/PAID`; `paidToDate = priorPaid + Σ PAID`; `outstanding = (priorBilled − priorPaid) + Σ reqs at FINAL/APPROVED` (incl. retention bills); `leftToBill = currentContract − billedToDate`; `retentionHeld = priorRetentionHeld + retainagePct × newBilled − retention bills sent`. **Close-out** (`closeoutFor()`): open reqs → WAITING_FOR_PAYMENT; else retention held and no retention bill → BILL_RETENTION; else → ARCHIVE. **Onboarding** (`onboardingSteps()`): six derived booleans — GC + ≥1 contact · ≥1 requirement · SOV APPROVED · owner set · a contact routed REQUISITION · any req past DRAFT.

---

## 3. Frontend wiring (your module conventions)

Keep every component. Replace the in-memory reads/mutations with hooks; the `window 'reqs-changed'` event becomes React Query invalidation.

| File | Contents |
|---|---|
| `api/projects.api.ts` | `list`, `get`, `setLifecycle`, `updateBilling`, `addContact`, `toggleContactRoute`, `removeContact` |
| `api/requisitions.api.ts` | `list`, `get`, `create`, `createRetention`, `saveLines`, `advanceStage`, `toggleHold`, `markPaid`, `skipMonth`, `unskipMonth` |
| `api/sov.api.ts`, `api/documents.api.ts`, `api/change-orders.api.ts`, `api/photos.api.ts`, `api/tasks.api.ts` | one file per resource, same shape as `catalog/api/costcodes.api.ts` |
| `schemas/*.schema.ts` | Zod versions of the `data.ts` interfaces; derive TS types with `z.infer` |
| `constants/requisitions.keys.ts` | `requisitionsKeys = { all, projects(), project(id), reqs(month?), req(id), sov(projectId), docs(projectId), cos(projectId), tasks() }` |
| `hooks/use-projects.ts`, `use-requisitions.ts`, `use-sov.ts`, `use-documents.ts`, `use-change-orders.ts`, `use-tasks.ts` | `useXQuery` / `useXMutation` wrappers with `toastApiError`; every mutation invalidates `requisitionsKeys.all` |
| `data.ts` | Shrinks to types + `stages.ts` metadata; seeds move to `backend/scripts/seederV2` (keep the seed values — they are the demo Peter reviews against) |

Mailbox: `src/modules/email/requisitions/data.ts › getMailboxTasks()` currently merges its own seed tasks with `deriveTasksFromRequisitionsModule()`; point it at `useTasksQuery()`.

---

## 4. Order of work

1. **Projects + Requisitions read path** — `GET /projects`, `GET /`, `GET /:id` with aging + checklist; frontend hooks; screens light up with real data.
2. **Requisition writes** — create, lines (the G702 math), stage (with the doc gate), hold, paid, skipped months.
3. **Documents** — requirements, records, file upload to S3, summary; `markDocFiled` from the requisition drawer.
4. **Change orders** — table, PDF upload, status, roll-up into `currentContract`.
5. **SOV** — upload/download, status transitions, optional Excel parse.
6. **Project billing settings + contacts + lifecycle** — the Projects tab drawer.
7. **Tasks endpoint** for the mailbox; remove the dev auth bypass (`src/app/lib/dev-auth-bypass.ts`); real clock.
8. Later: export a requisition to the SCA G702 workbook (server-side xlsx); Textura "submitted via / paid via" stamps; email intake to `requisitions@`.
