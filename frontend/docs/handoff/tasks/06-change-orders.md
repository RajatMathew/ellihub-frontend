# 06 · Change orders
**Who:** both · **Depends on:** card 05 · **Estimate:** M

## Goal
Change orders (Elli → GC) are real: list, create, advance status, attach a PDF. Approved amounts show
up in `currentContract` everywhere it's read (Projects tab, drawer, G702 editor). The Change Orders
tab and its New CO form read and write through the API.

## Where it shows in the UI
`change-orders-tab.tsx` (Pipeline · Board · List, CO drawer with inline PDF, status buttons, New CO
form). Also feeds `project-files.tsx` category 3 "Change Orders" (finish wiring that category now that
this table exists) and the `currentContract` figure already computed in card 02's `projectFinancials`
and read by `req-g702-editor.tsx`.

## Backend
**Table:** new `BillingChangeOrder` — `{ projectId, number, gcNumber?, title, trigger enum ASI·
FIELD_MOD·AWP·OWNER_DIRECTIVE·CODE·VE, triggerRef?, status enum DRAFT·SUBMITTED·IN_REVIEW·
PARTIALLY_EXECUTED·APPROVED·REJECTED, amount Decimal(15,2) (negative = deduct), daysAdded Int?,
dateSubmitted?, dateApproved?, approvedBy?, fileId? → File, linkedReqId? }`. Add
`primeChangeOrderId? → PrimeChangeOrder` so a billing CO can point at its Fieldwire twin when one
exists — `PrimeChangeOrder` (your existing Fieldwire mirror, `fieldwireId` required) is a **different
object**, not the same row.

**Endpoints** (mount at `/api/v1/requisitions`):
- `GET /change-orders?projectId=` — reproduces `getChangeOrdersForProject()`,
  `getApprovedCoValueForProject()` (Σ amount where status=APPROVED), `getPendingCoValueForProject()`
  (Σ amount where status ∈ {IN_REVIEW, SUBMITTED, PARTIALLY_EXECUTED}).
- `POST /change-orders` `{projectId, title, trigger, triggerRef?, amount, daysAdded?}` →
  `createDraftCo()`. Number = `CO#` + next sequence per project, zero-padded to 3 digits — read the
  highest existing number for that project (extract the digits), add 1 (e.g. Boyland's next after
  CO#005 is CO#006). Status starts at `DRAFT`.
- `PATCH /change-orders/:id/status` `{status, note?}` → `advanceCoStatus()`. Setting `status =
  APPROVED` also sets `dateApproved = now`. Write a history entry (`ActivityLog`,
  `entityType='billingChangeOrder'`).
- `POST /change-orders/:id/file` (multipart) → attaches the CO PDF (S3), same attachment pattern as
  elsewhere in the app.

Approved-CO roll-up: `currentContract = project.contractValue + approvedCos` is computed in
`projectFinancials()` (card 02) — once this table is populated, that function's `approvedCos` term
stops reading 0. No separate endpoint needed for the roll-up; it falls out of `GET /projects/:id`
automatically once you query real `BillingChangeOrder` rows instead of returning `0`.

## Frontend
- `api/change-orders.api.ts` — `list(projectId)`, `create`, `updateStatus`, `uploadFile` (multipart).
- `schemas/change-order.schema.ts` — Zod for `BillingChangeOrder`.
- `constants/requisitions.keys.ts` — add `cos(projectId)`.
- `hooks/use-change-orders.ts` — `useChangeOrdersQuery(projectId)`, `useCreateCoMutation`,
  `useUpdateCoStatusMutation`, `useUploadCoFileMutation`. Every mutation invalidates
  `requisitionsKeys.all` (COs affect `currentContract`, which the Projects tab and G702 editor both
  read).
- Swap `change-orders-tab.tsx` off `CHANGE_ORDERS`, `advanceCoStatus()`, `createDraftCo()`,
  `getApprovedCoValueForProject()`, `getPendingCoValueForProject()` onto the new hooks.

## Done when
- [ ] `GET /change-orders?projectId=boyland` returns the 4 seeded Boyland COs (#002–#005) with
      `getApprovedCoValueForProject` = $40,580 (18,400 + 22,180 approved; #004 partially executed and
      #005 in review don't count)
- [ ] Creating a new Boyland CO gets number `CO#006`
- [ ] Approving a CO immediately increases `currentContract` on the Boyland Projects-drawer KPI and in
      the G702 editor's "Contract Sum to Date" line (line 9), without a page reload
- [ ] The New CO form creates a Draft CO, and the status buttons walk it through Submitted → In
      Review → Approved
- [ ] `project-files.tsx` category 3 "Change Orders" reads from this table

## Don't
- Confuse `BillingChangeOrder` (Elli → GC, what this card builds) with `PrimeChangeOrder` (your
  existing Fieldwire mirror) or with an SCO (Elli → sub, which lives on the vendor's record, not
  here).
- Let a pending CO's amount count toward `currentContract` — only `APPROVED` ones roll in, everywhere
  (`real-vs-mock.md` "fixed by Peter").
- Change CO status names/order: Draft → Submitted → In review → Partially executed → Approved /
  Rejected.

## See also
`../contract.md` § 1 "Tables" (BillingChangeOrder row), § 2 "Endpoints › Change orders (Elli → GC)".
