# 09 · Tasks, auth, clock
**Who:** both · **Depends on:** card 08 · **Estimate:** M

## Goal
The `requisitions@` mailbox's Tasks board reads its module-derived cards from a real endpoint instead
of computing them client-side on every render. The dev auth bypass is gone. There is exactly one real
clock, not two hardcoded demo dates.

## Where it shows in the UI
`src/modules/email/requisitions/requisitions-inbox.tsx` (the Tasks board — calls
`getMailboxTasks(mailbox)`), plus every date/aging calculation across the whole requisitions module
(all prior cards) once the clock changes.

## Backend
**Endpoint:** `GET /tasks` — reproduces `deriveTasksFromRequisitionsModule()` (`data.ts` lines
1248–1381) exactly. Five card types, each with a **deterministic id** so a card disappears on its own
once the condition clears (no manual grooming, nothing to mark done):
1. **Pencil due** — draft requisitions in the current month: `id = req:{reqId}:pencil-due`, due date =
   `billingDatesForMonth(project, month).internalDue` (GC due − `internalLeadDays`), title uses the
   project's short name (before the em-dash) and month.
2. **Returned → revise** — requisitions at stage `returned`: `id = req:{reqId}:revise-final`, due 2
   days out.
3. **Missing doc → collect** — one card per missing monthly document on a requisition at `draft` or
   `pencil`: `id = req:{reqId}:doc:{requirementId}`, due 1 day out, whose "court" is `theirs` when the
   requirement's owner is a vendor, `ours` otherwise.
4. **Past terms → chase payment** — requisitions at `final`/`approved` with `daysLate > 0`:
   `id = req:{reqId}:chase-payment`, due date = `aging.dueOn`, names the contact routed `payment` for
   that project if one exists.
5. **Nothing started this month** — active projects with no requisition and no `SkippedMonth` for the
   current month: `id = project:{projectId}:start-billing:{month}`, due date = `billingDatesForMonth`
   `.start`.

Every card carries: `mailbox: 'requisitions'`, `title`, `status` (`overdue · today · tomorrow · week`
— bucketed from days until due), `assignee` (the project's owner/leadPM), `dueAt` (ISO), `due` (human
string), `project`, `linkedReq`, `source` (a one-line "why"), optional `detail`, `court`
(`ours`/`theirs`), optional `synced` (mapped from the project's channel: TEXTURA/SITELINE/PROCORE →
lowercase, EMAIL → none).

**Auth:** delete `src/app/lib/dev-auth-bypass.ts` and every `VITE_DEV_AUTH_BYPASS` /
`DEV_AUTH_BYPASS` shim that reads it — a repo-wide search for those two names turns up the bypass file
itself plus conditionals in `src/app/lib/mock/data.ts`, `src/app/lib/mock/adapter.ts`,
`src/app/api/client.ts`, `src/app/api/access.ts`, `src/app/api/auth-client.ts`, and
`src/app/vite-env.d.ts` (the env-var type declaration). Replace with the real Better Auth session flow
already used elsewhere in the app (`real-vs-mock.md`: "Remove; use Better Auth as elsewhere").

**Clock:** replace `todayIso()` in `data.ts` (hardcoded to return `'2026-07-13'`) with the real
clock, in the one place — every aging/onboarding/urgency function in this module calls through it, so
fixing it there fixes the whole module. Separately, the mailbox has its own anchor:
`requisitions-inbox.tsx` line 57, `const TODAY = '2026-07-07'`, plus several inline
`new Date('2026-07-07T...')` literals used for task-status bucketing, the week-strip's `today: true`
flag, and the calendar's default month — replace every one of those too, not just the named constant.

## Frontend
- `api/tasks.api.ts` — `list()`.
- `schemas/task.schema.ts` — Zod for `DerivedTask`.
- `constants/requisitions.keys.ts` — add `tasks()`.
- `hooks/use-tasks.ts` — `useTasksQuery()`.
- In `src/modules/email/requisitions/data.ts`, `getMailboxTasks()` currently calls
  `deriveTasksFromRequisitionsModule()` synchronously and merges it with `STATIC_SEED_TASKS`. Point
  the caller (`requisitions-inbox.tsx`) at `useTasksQuery()` instead, merging its result with
  `STATIC_SEED_TASKS` the same way. `getMailboxTasks` itself can either become a thin helper that
  takes the fetched tasks as an argument, or get inlined at the call site — either is fine as long as
  the merge logic (dedupe by id, filter by `mailbox`) doesn't change.
- Remove the `'reqs-changed'` / `'tasks-changed'` window-event listeners the mailbox uses to force a
  re-render — React Query's cache invalidation (from every mutation card 04–08 built) replaces them.

## Done when
- [ ] `GET /tasks` returns a "Send pencil" card for DCAS's July draft with the right due date from
      `billingDatesForMonth`
- [ ] Filing Boyland's last missing July document (via card 05) makes its
      `req:{id}:doc:{requirementId}` card disappear from the Tasks board without a page reload
- [ ] The mailbox Tasks board renders the same cards as today's mock for the current real date, not
      for 2026-07-07
- [ ] Opening the app with no `VITE_DEV_AUTH_BYPASS` set requires a real sign-in
- [ ] A search for `todayIso`, `DEV_AUTH_BYPASS`, and `2026-07-07`/`2026-07-13` across
      `src/modules/requisitions` and `src/modules/email/requisitions` returns nothing left to replace

## Don't
- Change the five task-card types, their id format, or the bucketing thresholds (`overdue / today /
  tomorrow / week`) — that's what makes cards self-clearing.
- Leave any second hardcoded "today" anywhere in these two modules — one clock, one place.
- Ship a real contact email that isn't `.example` — that's still true after this card; contacts remain
  card 08's job, not this one's.

## See also
`../contract.md` § 2 "Endpoints › Photos, tasks" (the `GET /tasks` row), § 3 "Frontend wiring" (the
`getMailboxTasks()` note), § 4 "Order of work" item 7.
