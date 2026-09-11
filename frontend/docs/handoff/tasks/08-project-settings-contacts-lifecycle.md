# 08 · Project settings, contacts, lifecycle
**Who:** both · **Depends on:** card 07 · **Estimate:** M

## Goal
The parts of the Projects drawer that edit the project itself — contacts, billing calendar, notes,
and the lifecycle buttons (archive / reopen / bill retention) — read and write through the API instead
of mutating `data.ts` in place.

## Where it shows in the UI
`project-detail.tsx`. Per the section-order comment at the top of that file (money → next action →
lifecycle block → **contacts → billing settings → notes** → documents → activity), this card is
**sections 4–6**: Contacts, Billing settings, Notes. It also wires the lifecycle buttons that live in
the "Set up" / "Close out" / "Archived" block above them (archive, reopen, and the "Bill for
retention" button that calls the endpoint card 04 already built).

## Backend
No new tables — this card writes to `Project`, `ProjectBilling`, and `ProjectBillingContact` (all
created in card 02).

**Endpoints** (mount at `/api/v1/requisitions`):
- `PATCH /projects/:id/lifecycle` `{lifecycle}` → `setLifecycle()`. Setting `lifecycle = ARCHIVED`
  also sets `archivedAt = now`; setting it to anything else clears `archivedAt`.
- `PUT /projects/:id/billing` `{retainagePct?, startRule?, startDay?, dueDay?, internalLeadDays?,
  netDays?, notes?, channel?}` → combines `setRetainagePct()` (clamp 0–100), `setBillingSchedule()`
  (patches whichever of `startRule`/`startDay`/`dueDay`/`internalLeadDays`/`netDays` were sent), and
  `setProjectNotes()` (trims whitespace; empty string clears the note).
- `POST /projects/:id/contacts` `{contactId | {fullName, role, email, phone}, routes}` →
  `addContact()`. Either link an existing directory `Contact` or create a new one under the project's
  GC, then create the `ProjectBillingContact` row with the given `routes`.
- `PATCH /projects/:id/contacts/route` `{contactId, route}` → `toggleContactRoute()`. Adds the route
  if the contact doesn't have it, removes it if they do — a toggle, not a set.
- `DELETE /projects/:id/contacts/:contactId` → `removeContact()`. Unlinks the `ProjectBillingContact`
  row only — **never deletes the directory `Contact`**.

## Frontend
- `api/projects.api.ts` — add `setLifecycle`, `updateBilling`, `addContact`, `toggleContactRoute`,
  `removeContact` to the card-02 file.
- `hooks/use-projects.ts` — add `useSetLifecycleMutation`, `useUpdateBillingMutation`,
  `useAddContactMutation`, `useToggleContactRouteMutation`, `useRemoveContactMutation`, plus wire up
  `useCreateRetentionMutation` (built in card 04, unused until now) to the "Bill for retention"
  button. Every mutation invalidates `requisitionsKeys.all`.
- Wire the Contacts block, the Billing settings section, and the Notes section in `project-detail.tsx`
  to the new hooks; wire the archive/reopen buttons to `useSetLifecycleMutation`.

## Done when
- [ ] Editing Hollis's retainage from 5% to something else and back updates the G702 editor's default
      retainage immediately
- [ ] Adding a new contact to PS 508Q, routing them to "Requisitions," shows up in that project's
      onboarding step "Submit-to contact" (card 02) as done
- [ ] Removing a contact from a project does not remove them from the directory — check the directory
      still lists them afterward
- [ ] Archiving JFK T6 (already archived in seed data) and reopening it round-trips `archivedAt`
      correctly
- [ ] Clicking "Bill for retention" on Kings County (fully billed, retention held > 0) creates the
      retention requisition via the card-04 endpoint and the close-out step updates

## Don't
- Delete a directory `Contact` when removing them from a project — only the project link goes away.
- Let `toggleContactRoute` behave like a set-to-value call — it must flip the current state.
- Duplicate retainage storage — it's still only on `Project.retainagePercent` (card 02).
- Change the drawer's section order or the "Set up / Close out / Archived" block's wording — those are
  approved UI (`real-vs-mock.md`).

## See also
`../contract.md` § 2 "Endpoints › Projects (registry)" (the lifecycle/billing/contacts rows), § 1
"Tables" for `ProjectBillingContact`.
