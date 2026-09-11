# 04 · Requisition writes
**Who:** both · **Depends on:** card 03 · **Estimate:** L

## Goal
Every requisition mutation from the prototype exists as a real endpoint, math ported exactly, wired
to mutation hooks that invalidate the card-03 read path instead of firing the `reqs-changed` DOM
event.

## Where it shows in the UI
`req-g702-editor.tsx` (save % complete / stored), `req-detail.tsx` (stage buttons, hold toggle, mark
paid), `project-detail.tsx`'s close-out section (the "Bill for retention" button — the endpoint is
built here, the button itself is wired in card 08), `requisitions-tab.tsx`'s Pipeline grid (Start /
Skip / Not-billing cells).

## Backend
Endpoints (mount at `/api/v1/requisitions`):
- **`POST /` `{projectId, month}`** → `createDraftReq()`. `seq` = max existing seq for that project +
  1. If a requisition already exists for `(projectId, month)`, return it — don't duplicate. Deletes
  the `SkippedMonth` row for that `(projectId, month)` if one exists. Nothing else changes
  automatically for an ONBOARDING project — it only flips to ACTIVE on the first non-draft stage
  (below).
- **`POST /retention` `{projectId}`** → `createRetentionBill()`. **Unlike the prototype's
  `createRetentionBill(projectId, amount)` signature**, the endpoint takes only `{projectId}` — compute
  the amount server-side as `projectFinancials(projectId).retentionHeld` at call time (round to 2
  decimals) so it can't be spoofed from the client. `pctComplete = 100`, `isRetentionBill = true`. One
  retention bill per project — return the existing one if called again.
- **`PUT /:id/lines` `{lines:[{sovLineId, pct, stored}]}`** → `saveReqLinePcts()`. **Port this math
  exactly** (`data.ts` lines 732–773):
  ```
  for each SOV line on the project:
    thisPct   = incoming pct for that line (0 if not sent)
    priorPct  = same project+line's pct on the most recent EARLIER requisition (by month), else 0
    delta     = max(0, thisPct − priorPct)
    amount   += line.scheduled × (delta / 100)
    storedNow   = incoming stored for that line (0 if not sent)
    storedPrior = same project+line's stored $ on the most recent earlier requisition, else 0
    amount   += storedNow − storedPrior
    stored   += storedNow
    cumulativePct       += thisPct × line.scheduled
    cumulativeScheduled += line.scheduled

  req.amount      = round2(amount)
  req.storedTotal = round2(stored)
  req.pctComplete = cumulativeScheduled > 0 ? round1(cumulativePct / cumulativeScheduled) : 0
  ```
  "Most recent earlier requisition" = among this project's requisitions with `month <` this one,
  newest-month-first, the first one carrying a value for that line. Write an `ActivityLog` entry
  (`entityType='requisition'`, `action` = current stage, `note` = "edited % completed" or "edited %
  completed + stored material").
- **`PATCH /:id/stage` `{stage, cause?}`** → `advanceReqStage()`. Refuse (4xx, with a message the UI
  can show) a transition to `FINAL` while any monthly document for that requisition's month is not
  `FILED` — same check as `missingDocsForReq()`. If the project's lifecycle is `ONBOARDING` and the
  new stage isn't `DRAFT`, flip the project to `ACTIVE` in the same transaction. Write an
  `ActivityLog` entry. `PATCH /:id/paid` (below) reuses this same path — it's a stage transition to
  `PAID`, including the same ONBOARDING flip and ActivityLog write.
- **`PATCH /:id/hold`** → `toggleReqFlag('hold')`. No body — toggles the one manual flag on/off.
- **`PATCH /:id/paid` `{via}`** → `markReqPaid()`. Sets `paidVia`, then runs the same logic as
  `PATCH /:id/stage` with `stage = PAID`.
- **`POST /skipped-months` `{projectId, month, reason?}`** → `skipMonth()`. Refuse if a requisition
  already exists for that `(projectId, month)`. **`DELETE /skipped-months/:id`** → `unskipMonth()`.

**Acceptance check** — run this before calling the card done. One SOV line scheduled at $620,000,
billed to 30% this period, $50,000 newly stored, no prior requisition on that project (`priorPct=0`,
`priorStored=0`):
```
completed (this line) = 620,000 × 30%        = 186,000
stored                                        =  50,000
line total             = 186,000 + 50,000    = 236,000
retainage @ 10%        = 18,600 (on completed) + 5,000 (on stored) = 23,600
current payment due     = 236,000 − 23,600    = 212,400
```
`PUT /:id/lines` must return `amount: 236000, storedTotal: 50000`. Retainage (23,600) and current
payment due (212,400) are computed by the G702 editor client-side from that saved data plus
`retainagePct` — confirm the editor displays them correctly end to end, not just the raw endpoint
response.

## Frontend
- `api/requisitions.api.ts` — add `create`, `createRetention`, `saveLines`, `advanceStage`,
  `toggleHold`, `markPaid`, `skipMonth`, `unskipMonth` to the card-03 file.
- `hooks/use-requisitions.ts` — add `useCreateReqMutation`, `useCreateRetentionMutation`,
  `useSaveLinesMutation`, `useAdvanceStageMutation`, `useToggleHoldMutation`, `useMarkPaidMutation`,
  `useSkipMonthMutation`, `useUnskipMonthMutation`. Every one invalidates `requisitionsKeys.all` on
  success — the direct replacement for `window.dispatchEvent(new Event('reqs-changed'))`.
- Wire `req-g702-editor.tsx`'s save action to `useSaveLinesMutation`; `req-detail.tsx`'s stage
  buttons / hold toggle / mark-paid to the matching mutations; the Pipeline grid's Start / Skip /
  Not-billing cells in `requisitions-tab.tsx` to `useCreateReqMutation` / `useSkipMonthMutation` /
  `useUnskipMonthMutation`. (`useCreateRetentionMutation` exists after this card but isn't wired to a
  button until card 08 — that's `project-detail.tsx` territory.)
- Use `toastApiError` on every mutation's error handler — surface the document-gate refusal as a
  visible toast, don't fail silently.

## Done when
- [ ] The acceptance check above returns exactly `amount: 236000, storedTotal: 50000`, and the G702
      editor shows $23,600 retainage / $212,400 current payment due for it
- [ ] Advancing Boyland's July requisition to `FINAL` while `dr-boy-2`/`dr-boy-3` are still missing is
      refused, and the UI shows why instead of silently succeeding
- [ ] Advancing 489 State Street's first requisition past Draft flips the project from Onboarding to
      Active on the Projects tab
- [ ] Clicking "Skip" on an empty Pipeline cell marks it skipped; clicking "Start" on a skipped cell
      creates the draft and clears the skip
- [ ] No component calls `window.dispatchEvent(new Event('reqs-changed'))` anymore — invalidation runs
      through the mutation hooks

## Don't
- Loosen the document gate for any reason — a requisition cannot go to Final while a monthly document
  for that month is not Filed, no override flag (`.claude/rules/requisitions-module.md`, `real-vs-mock.md` "fixed by Peter").
- Turn `pastDue` into a stored column.
- Apply retention only to completed work — it applies to completed **and** stored, per the
  acceptance check.
- Add new manual flags — `hold` is the only one; `pastDue` is never manual.
- Trust a client-sent `amount` on `POST /retention` — compute it server-side.

## See also
`../contract.md` § 2 "Endpoints › Requisitions" (full table + the `PUT /:id/lines` math), § 3
"Frontend wiring" (mutation hook list).
