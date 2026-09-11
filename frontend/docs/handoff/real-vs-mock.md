# Requisitions module — what is real, what is mock, what is yours

Read this before touching anything. "Done" means Peter has reviewed it and it must not be redesigned.
"Mock" means the screen works end-to-end on in-memory data in `src/modules/requisitions/data.ts`.
"Yours" is the backend/persistence work in `contract.md`.

| Screen / piece | UI | Data today | Yours |
|---|---|---|---|
| **Projects tab** (front door) — Pipeline · Board · List, four lifecycle buckets, next-action line, drawer with KPIs / onboarding checklist / month timeline / close-out / contacts / billing settings / notes / documents / activity | Done | Derived in `registry.ts` from the in-memory seeds | `GET /projects`, `GET /projects/:id`, lifecycle / billing / contacts endpoints |
| **SOV tab** — Pipeline · Board · List, file card (Download / Open), original + approved COs = current contract | Done | Seeds; `489 State Street` opens the real workbook from `public/reqs/489-state-street/SOV.xlsx` | `File` upload/download (S3), `PATCH /sov/:id/status` |
| **Requisitions tab** — Pipeline (project × month grid with Start / Skip / Not billing), Board, List (submitted · due · days late) | Done | Seeds + `SKIPPED_MONTHS`; aging computed from history | `GET /`, `POST /`, skipped months |
| **Requisition drawer** — stage advance gated on documents, hold, aging, send-to contact, mark as paid, project note, history | Done | Seeds; gate = `missingDocsForReq()` | `PATCH /:id/stage` (same gate server-side), `/hold`, `/paid` |
| **G702 editor** — per-line This % + Stored $, certificate lines 1–9 live, retainage % from the project | Done | `saveReqLinePcts()` math in `data.ts` | `PUT /:id/lines` — port the math exactly |
| **Change Orders tab** — Pipeline · Board · List, CO drawer with inline PDF, status buttons, New CO form | Done | Seeds; Boyland PDFs are real files in `public/reqs/boyland/` | `BillingChangeOrder` table, PDF upload, status endpoint |
| **Documents tab** — per-project files view (SOV · Requisitions · COs · Photos · Compliance · Templates · CPR · Safety · Insurance), template editor (monthly / one-time), ledger (Pipeline · Board · List, List default), photos | Done | Files view for Boyland is a **static list reproduced from Peter's drive** (`project-files.tsx`) — not connected to a file store; ledger + templates are seeds | `DocRequirement` / `DocRecord` tables, `File` tree per project, `PATCH /documents/records/file` |
| **Mailbox › requisitions@ Tasks board** — cards derived from module state (pencil due, returned, collect doc, chase payment, start month) | Done | `deriveTasksFromRequisitionsModule()` merged with the mailbox's own seed tasks | `GET /tasks` (or derive client-side from fetched data) |
| **Email threads on requisitions@** | Done (demo) | Mock threads in `src/modules/email/requisitions/data.ts` | Out of scope for this handoff (intake to `requisitions@` is a later phase) |
| **Loans tab** (Admin) | Done | In-memory | Separate handoff; not part of this package |
| **Auth** | — | Dev bypass in `src/app/lib/dev-auth-bypass.ts` | Remove; use Better Auth as elsewhere |
| **Clock** | — | Two demo clocks: the module's `todayIso()` is `2026-07-13`; the mailbox's home/tasks anchor is `2026-07-07` (its own seed). Derived task cards carry ISO `dueAt` and the mailbox re-renders "days late" against its own clock | One real clock server-side; delete both anchors |
| **Names, emails, dollar amounts in seeds** | — | Project names and Boyland CO PDFs are real; contact names/emails are placeholders (`*.example`) | Replace with the directory (`Contact`) — never ship the placeholders |
| **Shared-component restyle** (ELLI palette on sidebar, tables, project pages in the July commits) | — | Present on this branch, touches ~70 shared files | **Not in this PR.** Separate, later. Do not merge it with the module. |

## Fixed by Peter — do not change
- Tab order and names: **Projects · SOV · Requisitions · Change Orders · Documents**. Projects is the landing tab.
- Views on every tab: **Pipeline (default) · Board · List** — except Documents, where List is the default.
- Stage names and order: Draft → Pencil → Returned → Final → Approved → Paid; **Hold** and **Past due** are flags, not stages; Past due is computed, never typed.
- The document gate: a requisition cannot go to Final while a monthly document for that month is not Filed.
- Approved change orders add to the contract sum everywhere; pending ones never do.
- Retention % lives on the project (Hollis 5 %, everyone else 10 %); the G702 defaults to it.
- Wording on screen: plain words, one action per screen. If a label reads like software, it is wrong.
