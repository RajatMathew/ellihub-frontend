# Requisitions module — task index

Backend under an approved, already-built UI. Read `../README.md` (voice + working rules) and
`../real-vs-mock.md` (what's done / mock / yours) before you open card 01. `../contract.md` is the
spec every card below quotes from — each card restates the exact endpoints/tables/math it needs so
you can paste that one card into Claude Code with no other context, but `../contract.md` is where to
look if something feels ambiguous.

Branch: `peter/requisitions-module`. Demo: `http://localhost:5174/app/requisitions`. Same cards are
the GitHub issues — one issue per card, same number and title.

## The three working rules (from README)

1. **Readback first.** Before you code a card, reply on its issue with your own 10-line plan, in your
   own words. Peter answers the same day — this is where misunderstandings get caught on day one, not
   week three.
2. **One card at a time, in order.** Do them 01 → 09 in sequence. Each card ends with a clickable
   increment on the demo URL, not a description of what you did.
3. **Questions go on the issue**, not in email or chat threads.

## Cards

| # | Title | Who | Depends on | Done when |
|---|---|---|---|---|
| [01](01-run-and-readback.md) | Run and readback | Rajat + Yasim | — | Readback posted on the issue and Peter has replied |
| [02](02-projects-read-path.md) | Projects read path | both | 01 | Projects tab renders from the API with the seed data and every number matches the prototype |
| [03](03-requisitions-read-path.md) | Requisitions read path | both | 02 | Requisitions tab + drawer + G702 editor render from the API with the seed data |
| [04](04-requisition-writes.md) | Requisition writes | both | 03 | The $620,000/30%+$50,000-stored acceptance check returns completed 186,000 · stored 50,000 · total 236,000 · retainage 23,600 · current payment due 212,400 |
| [05](05-documents.md) | Documents | both | 04 | Documents tab (template editor, ledger, per-project files) and the requisition drawer's checklist read and write through the API |
| [06](06-change-orders.md) | Change orders | both | 05 | Change Orders tab lists/creates/advances COs through the API; approved amounts show up in `currentContract` everywhere |
| [07](07-sov.md) | SOV | both | 06 | SOV tab uploads, downloads, and advances status through the API |
| [08](08-project-settings-contacts-lifecycle.md) | Project settings, contacts, lifecycle | both | 07 | Projects drawer sections 4–6 (contacts, billing settings, notes) and the archive/reopen/bill-retention buttons write through the API |
| [09](09-tasks-auth-clock.md) | Tasks, auth, clock | both | 08 | Mailbox Tasks board renders from `GET /tasks`, the dev auth bypass is gone, and there is one real clock |
| [10](10-later.md) | Later (not now) | — | — | Reference only — nobody builds these until Peter says so |

"Depends on" here means sequence, not just data dependencies — per rule 2, do them in order even where
a later card's tables don't strictly require an earlier one's endpoints yet.
