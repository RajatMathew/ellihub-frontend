# 03 · Requisitions read path
**Who:** both · **Depends on:** card 02 · **Estimate:** M

## Goal
`GET /api/v1/requisitions` and `GET /api/v1/requisitions/:id` return real requisitions with computed
aging and flags. The Requisitions tab (Pipeline project×month grid, Board, List), the requisition
drawer, and the G702 editor render from the API instead of `data.ts`.

## Where it shows in the UI
`src/modules/requisitions/requisitions-tab.tsx` (Pipeline grid with Start/Skip/Not-billing cells,
Board, List showing submitted/due/days-late), `req-detail.tsx` (drawer — read side only; buttons are
card 04), `req-g702-editor.tsx` (per-line This % + Stored $ grid; the certificate math above it is
untouched client-side math — see Don't).

## Backend
**Tables:**
- New **`Sov`, `SovGroup`, `SovLine`**: `Sov { projectId, rev Int, status enum DRAFT·SENT·
  MARKED_UP·RESUBMITTED·APPROVED, source enum EXCEL_UPLOAD·BUILT_IN_APP, fileId? → File, sentAt?,
  approvedAt? }`; `SovGroup { sovId, label }`; `SovLine { sovId, groupId?, code, description,
  scheduled Decimal(15,2), sort Int }`. One approved SOV per project at a time. Upload/status wiring
  is card 07 — for this card, seed at least one approved `Sov` + lines per project (copy the seed
  values from `data.ts`'s `SOVS` array) so the G702 editor has real lines to read.
- New **`Requisition` + `RequisitionLine`**: `Requisition { projectId, month String "YYYY-MM", seq
  Int, stage enum DRAFT·PENCIL·RETURNED·FINAL·APPROVED·PAID, amount Decimal(15,2), pctComplete
  Decimal(5,1)?, storedTotal Decimal(15,2)?, retainagePct Decimal(5,2)?, hold Boolean,
  isRetentionBill Boolean, paidVia enum CHECK·ACH·TEXTURA·PROCORE?, fileId? → File }`,
  `@@unique([projectId, month, isRetentionBill])`. `RequisitionLine { requisitionId, sovLineId, pct
  Decimal(5,1), stored Decimal(15,2) }`, `@@unique([requisitionId, sovLineId])`. **`pastDue` is never
  a stored column** — it's computed on every read (see Aging below).
- New **`SkippedMonth` { projectId, month, reason?, createdBy }**, `@@unique([projectId, month])`
  (plus the usual `id` primary key — card 04's `DELETE /skipped-months/:id` needs one).
- History rides on the **existing `ActivityLog`** (`entityType='requisition'`, `action` = the stage,
  `note` = cause) — no separate history table.
- `GET /:id` also returns the document checklist for the requisition's month, which needs
  **`DocRequirement`** and **`DocRecord`** to exist. Create both now (full CRUD + S3 upload is card
  05's job — this card only reads them): `DocRequirement { projectId, owner enum US·VENDOR, vendorId?
  → Vendor, form String, sort Int, cadence enum MONTHLY·ONE_TIME }`; `DocRecord { requirementId,
  projectId, month, status enum MISSING·RECEIVED·FILED, fileId? → File, expiresOn DateTime? }` —
  monthly rows unique on `(requirementId, month)`; one-time docs (cadence = ONE_TIME) can have many
  records, and the checklist uses the newest one with `status = FILED` (`latestOneTimeRecord()` —
  sort by `filedAt` desc, take the first). A one-time doc only counts as filed while `expiresOn >=
  today`; past that it reads as missing but keep the expiry date so the UI can say "expired Jun 30"
  (port `getRecordsForReq()`, `data.ts` lines 851–871, exactly).

**Endpoints** (mount at `/api/v1/requisitions`):
- `GET /?month=&projectId=` — reproduces `REQUISITIONS` filtering + `getAllReqsSortedByMonthDesc()` +
  `monthsOnFile()`. Every row carries `aging` and `effectiveFlags` (below). **When filtered by
  `projectId`, include each requisition's `RequisitionLine[]`** (`sovLineId`, `pct`, `stored`) — the
  G702 editor's "prior %" / "prior stored" columns walk a project's own requisition history
  client-side (`priorLinePct()` / `priorLineStored()`, `data.ts` lines 703–726) and need every
  sibling requisition's line data to do it, not just the current one.
- `GET /:id` — reproduces `getReq()` + `getRecordsForReq()` + `missingDocsForReq()` + `reqAging()`.
  Returns the requisition, its lines, and the document checklist for its month.

**Aging** (`reqAging()`, `data.ts` lines 1196–1211 — compute on every read, never store):
```
submittedOn = first ActivityLog entry with action=FINAL for this req, else first with action=APPROVED
if no submittedOn: daysOut = 0, daysLate = 0, stop here
dueOn    = submittedOn + project.netDays days
avg      = avgDaysToPaid(projectId)  — mean of (paidOn − submittedOn) over this project's PAID
           requisitions, non-negative samples only; undefined if there are none
open     = stage is FINAL or APPROVED
daysOut  = paidOn ? (paidOn − submittedOn) : max(0, today − submittedOn)
daysLate = open ? max(0, today − dueOn) : 0
predictedPaidOn = avg !== undefined ? submittedOn + avg days : dueOn
```
`effectiveFlags` = the requisition's manual flags (only `hold` is ever manual) plus `pastDue` appended
when `daysLate > 0` and it isn't already present.

## Frontend
- `api/requisitions.api.ts` — `list(filters?)`, `get(id)` for now (writes land in card 04).
- `api/sov.api.ts` — `get(projectId)` only for now (upload/status is card 07).
- `schemas/requisition.schema.ts`, `schemas/sov.schema.ts` — Zod for `Requisition`, `RequisitionLine`,
  `ReqAging`, `Sov`/`SovGroup`/`SovLine`.
- `constants/requisitions.keys.ts` — add `reqs(month?)`, `req(id)`, `sov(projectId)`.
- `hooks/use-requisitions.ts`, `hooks/use-sov.ts` — `useRequisitionsQuery(filters?)`,
  `useRequisitionQuery(id)`, `useSovQuery(projectId)`.
- Swap `requisitions-tab.tsx`, `req-detail.tsx`, `req-g702-editor.tsx` off `REQUISITIONS`,
  `getReqsForMonth()`, `getReq()`, `getSov()`, `missingDocsForReq()`, `reqAging()`, `effectiveFlags()`,
  `priorLinePct()`, `priorLineStored()` onto the new hooks (the two `prior*` helpers can stay as plain
  functions operating on the fetched project requisitions — their logic doesn't change).

## Done when
- [ ] `GET /api/v1/requisitions?month=2026-07` returns Hollis #5 (pencil), Boyland #38 (returned),
      Sinai #4 (approved), DCAS #8 (draft), Hip Hop #18 (final + hold), Success Academy #6 (returned)
      — each with `aging` and `effectiveFlags`
- [ ] The Pipeline grid shows the same cell states per project × month as the mock, including
      2026-03 Boyland / 2026-06 Success Academy / 2026-06 DCAS reading "Skipped"
- [ ] Opening Boyland #38 shows its document checklist as 2 filed / 1 received / 2 missing
      (`dr-boy-2`, `dr-boy-3` missing)
- [ ] The G702 editor for Hollis #5 lists all 12 SOV lines with a total scheduled of $310,000
- [ ] Network tab shows zero calls into `REQUISITIONS`, `getReq`, `getSov`, `missingDocsForReq`,
      `reqAging` from the three components above

## Don't
- Store `pastDue` as a column anywhere — computed every read, always (`.claude/rules/requisitions-module.md`, `real-vs-mock.md`
  "fixed by Peter").
- Build the requirements-CRUD or file-upload endpoints here — read-only tables + seed rows are enough;
  card 05 owns the writes.
- Touch the G702 certificate math (retainage split, earned-less-retainage, current-payment-due,
  balance-to-finish) — it's client-side `useMemo` in `req-g702-editor.tsx` and stays that way; your
  job is making sure it keeps receiving the same shape of data it does today.
- Change the Pipeline/Board/List view order or the stage names/order.

## See also
`../contract.md` § 1 "Tables" (Sov/SovGroup/SovLine, Requisition/RequisitionLine, SkippedMonth,
DocRequirement, DocRecord rows), § 2 "Endpoints › SOV" and "› Requisitions", the "Aging" definition.
