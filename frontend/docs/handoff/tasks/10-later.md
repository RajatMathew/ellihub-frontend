# 10 · Later
**Who:** — (not scheduled) · **Depends on:** card 09 · **Estimate:** —

Not now. These three are named here only so nobody builds them early, mistaking them for part of
cards 01–09. One paragraph each — no design work has gone into any of them yet, and per README the
UI for them doesn't exist and isn't approved.

## Export a requisition to the SCA G702 workbook
Some GCs (489 State Street's note in `data.ts` says so explicitly: "bill on the SCA G702 workbook")
want the requisition back as an actual Excel file in the SCA's own G702/G703 layout, not just numbers
on screen. That means a server-side xlsx generator (not a client-side one — these files get emailed to
GCs and need to look identical every time) that takes a `Requisition` + its `RequisitionLine`s + the
project's `Sov` and produces the certificate pages plus the continuation sheet. Nobody has picked the
xlsx library or mapped cell-by-cell yet.

## Textura "submitted via / paid via" stamps
Several projects (Boyland, Mount Sinai, Hip Hop Museum) actually submit and get paid through Textura,
and the module already stores `paidVia: 'textura'` on a requisition — but there's no real Textura
integration, just the field. This item is a real API or webhook connection to Textura so submission
and payment status update automatically instead of someone manually setting the stage. Scope
(read-only status pull vs. two-way submission) hasn't been decided.

## Email intake to requisitions@
Right now `src/modules/email/requisitions/data.ts` has hand-written seed threads that only *look* like
they came from `requisitions@ellicorp.com`. Real intake — actual inbound email creating or updating a
thread, matching it to a project and requisition, maybe triggering one of the derived task cards from
card 09 — is a separate, later phase. Don't build any part of this while doing card 09; that card only
makes the Tasks board read real derived data, it does not make the mailbox itself real.

## See also
`../contract.md` § 4 "Order of work", item 8 (lists these same three).
