# 07 · SOV
**Who:** both · **Depends on:** card 06 · **Estimate:** M

## Goal
The Schedule of Values file itself is real: upload the GC's Excel, download it back, and advance its
status. The SOV tab's file card goes from a static link (`sov.fileUri`) to a real S3-backed upload
and a status pipeline that bumps the revision.

## Where it shows in the UI
`sov-tab.tsx` (Pipeline · Board · List, the file card with Download / Open — today these are plain
`<a href={sov.fileUri}>` links to a static path). Also finishes `project-files.tsx` category 1 "SOV".

## Backend
The `Sov` / `SovGroup` / `SovLine` schema already exists from card 03 (it was created early because
the G702 editor needs lines to read). This card adds the write endpoints on top of those same tables.

**Endpoints** (mount at `/api/v1/requisitions`):
- `GET /sov?projectId=` — current rev with groups + lines + file. (Already built in card 03 as
  `get(projectId)`; nothing new here unless you split it out.)
- `POST /sov` (multipart) → the file card's upload action. Upload the GC's Excel to S3 → creates a
  `File` row. If you want the lines editable in-app afterward, parse the workbook server-side into
  `SovLine` rows (`source = EXCEL_UPLOAD`) — otherwise just store the file and leave `source =
  EXCEL_UPLOAD` with the lines entered by hand elsewhere. Either is acceptable; note which you picked
  on the issue.
- `PATCH /sov/:id/status` `{status, note?}` — writes an `ActivityLog` entry
  (`entityType='sov'`). Status only moves forward: `SENT → MARKED_UP → RESUBMITTED → APPROVED`.
  **`SENT` bumps `rev`** (increment the integer) — this is how the prototype represents "we sent a
  new version." Only one `Sov` row should read as `status = APPROVED` per project at a time.

## Frontend
- `api/sov.api.ts` — add `upload` (multipart) and `updateStatus` to the `get(projectId)` built in
  card 03.
- `hooks/use-sov.ts` — add `useUploadSovMutation`, `useUpdateSovStatusMutation` to the query hook from
  card 03. Both invalidate `requisitionsKeys.all` (a new SOV rev changes `sovTotal()`, which the G702
  editor and the Projects-drawer onboarding step both read).
- Replace the plain `<a href={sov.fileUri}>` Download/Open links in `sov-tab.tsx` with the real file
  URL returned by the API (still a plain link/anchor is fine — it just needs to point at a real S3
  object instead of a static public path), and wire the file card's upload control and status buttons
  to the new mutations.
- Finish `project-files.tsx` category 1 "SOV" (rev history + file link) off the same hooks.

## Done when
- [ ] Uploading a new Excel for PS 508Q (currently `status: draft`) creates a `File`, and the SOV tab
      shows the new file name / size
- [ ] Advancing 489 State Street's SOV from Sent to Marked Up to Resubmitted to Approved logs 3
      activity entries and leaves exactly one `APPROVED` row for that project
- [ ] Sending a new revision (status → `SENT`) on a project that already has an approved SOV bumps
      `rev` by 1
- [ ] `489-state-street/SOV.xlsx`'s real file (the one already in `public/reqs/489-state-street/`)
      still downloads correctly once it's served from wherever your upload endpoint stores it
- [ ] The Projects-drawer onboarding step "SOV approved" (card 02) reflects the real `Sov.status`

## Don't
- Allow two `APPROVED` `Sov` rows to exist for the same project at once.
- Skip the `rev` bump on `SENT` — the UI's revision number depends on it.
- Change the SOV status pipeline names/order: Draft → Sent to GC → Marked up by GC → Resubmitted →
  Approved · locked.

## See also
`../contract.md` § 1 "Tables" (Sov/SovGroup/SovLine row), § 2 "Endpoints › SOV".
