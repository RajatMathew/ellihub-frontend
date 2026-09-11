# 05 · Documents
**Who:** both · **Depends on:** card 04 · **Estimate:** L

## Goal
Document requirements (the per-project template of what must ride with every final) and document
records (the ledger) are real, filing a document uploads to S3, and the Documents tab plus the
requisition drawer's checklist read and write through the API instead of `data.ts`.

## Where it shows in the UI
`documents-tab.tsx` (per-project files view, template editor, ledger — Pipeline/Board/List with List
default, photos), `documents-template-editor.tsx` (add/remove a requirement, set its cadence),
`project-files.tsx` (the per-project file browser — categories 4 Photos, 5 Compliance Docs, 6
Templates, 7 CPR, 8 Safety, 9 Insurance are this card's to wire for real; categories 1 SOV, 2
Requisitions, 3 Change Orders stay reading `data.ts` until cards 07, 03/04, and 06 respectively — this
view genuinely spans the whole module, don't try to finish it all here), and the document checklist
inside `req-detail.tsx`'s requisition drawer.

## Backend
**Tables** (`DocRequirement`/`DocRecord` schema already exists from card 03 — this card adds the
management endpoints on top, plus `Photo` which card 03 didn't need):
- `DocRequirement { projectId, owner enum US·VENDOR, vendorId? → Vendor, form String, sort Int,
  cadence enum MONTHLY·ONE_TIME }`.
- `DocRecord { requirementId, projectId, month, status enum MISSING·RECEIVED·FILED, fileId? → File,
  expiresOn DateTime? }` — monthly unique on `(requirementId, month)`; one-time docs get a fresh
  record each time they're refiled.
- New `Photo { projectId, category enum, month?, caption, takenAt, fileId → File,
  linkedRequirementId? }` — categories: `stored-material · project-label · sign-in-sheet · jobsite ·
  delivery · other`.

**Endpoints** (mount at `/api/v1/requisitions`):
- `GET /documents/requirements?projectId=` → `getRequirementsForProject()` (sorted by `sort`/`order`).
- `POST /documents/requirements` `{projectId, owner, form, vendorId?, cadence}` → `addRequirement()`.
  `PUT /documents/requirements/:id` `{cadence}` → `setRequirementCadence()`. `DELETE
  /documents/requirements/:id` → `removeRequirement()`.
- `GET /documents/records?projectId=&month=` → the raw ledger rows, plus `latestOneTimeRecord()`
  logic for one-time requirements.
- **`PATCH /documents/records/file` `{requirementId, month, projectId, fileId}`** → `markDocFiled()`.
  **Monthly**: upsert on `(requirementId, month)` → status `FILED`, `filedAt = now`. **One-time**:
  always insert a new record (never update an old one) with `status = FILED`, `filedAt = now`,
  `expiresOn = now + 365 days` unless the caller supplies one. The file itself is uploaded to S3 first
  (same pattern as `POAttachment` elsewhere in the app) and `fileId` is what this call receives.
- `GET /documents/summary?projectId=` → `docsSummaryFor()`. Port exactly (`registry.ts` lines
  143–174): for every requisition at stage `pencil · returned · final`, walk its monthly (non-one-time)
  checklist rows — each unfiled one increments `openMonthly`, and if that month's GC-due date
  (`billingDatesForMonth()`) has already passed, also increments `pastDueMonthly`. Separately, for
  every one-time requirement: no record ever filed, or the latest one's `expiresOn` is in the past →
  `oneTimeMissing`; `expiresOn` within 30 days → `oneTimeExpiringSoon`; track the earliest upcoming
  `expiresOn` as `nextExpiry`.
- `GET /photos?projectId=&category=` / `POST /photos` (multipart) → `getPhotosForProject()`.

## Frontend
- `api/documents.api.ts` — `getRequirements`, `addRequirement`, `setCadence`, `removeRequirement`,
  `getRecords`, `markFiled` (multipart), `getSummary`.
- `api/photos.api.ts` — `list`, `create` (multipart).
- `schemas/document.schema.ts`, `schemas/photo.schema.ts` — Zod for `DocRequirement`, `DocRecord`,
  `DocsSummary`, `Photo`.
- `constants/requisitions.keys.ts` — add `docs(projectId)`, `docRecords(projectId, month?)`,
  `docsSummary(projectId)`, `photos(projectId)`.
- `hooks/use-documents.ts` — `useRequirementsQuery`, `useAddRequirementMutation`,
  `useSetCadenceMutation`, `useRemoveRequirementMutation`, `useRecordsQuery`,
  `useMarkFiledMutation`, `useDocsSummaryQuery`. `hooks/use-photos.ts` for photos.
- Wire `documents-template-editor.tsx` off `addRequirement()`/`getRequirementsForProject()`/
  `removeRequirement()`/`setRequirementCadence()` onto the new hooks; wire the ledger + the 6
  categories named above in `project-files.tsx` off `DOC_RECORDS`/`DOC_REQUIREMENTS`/`PHOTOS`/
  `latestOneTimeRecord()`; wire the checklist section of `req-detail.tsx` (currently calls
  `markDocFiled()` directly) onto `useMarkFiledMutation`.

## Done when
- [ ] `GET /documents/requirements?projectId=boyland` returns the 6 seeded requirements in order,
      with `dr-boy-6` (COI) as `cadence: ONE_TIME`
- [ ] Filing Boyland's July `dr-boy-2` (Ridgewood lien waiver) through the requisition drawer's
      checklist updates that row to Filed everywhere it appears (drawer checklist, ledger)
- [ ] `GET /documents/summary?projectId=hiphop` reflects BK Tile's expired COI (`dr-hhm-2`, expired
      2026-06-30) as 1 `oneTimeMissing`, matching why Hip Hop's July requisition is on hold
- [ ] The template editor can add a requirement, set it to one-time, and remove it, and the change
      shows up in the ledger without a page reload
- [ ] Once this card's endpoints are live, card 04's document gate (`PATCH /:id/stage` → FINAL) is
      exercised against real data instead of seed rows

## Don't
- Loosen the document gate — that logic lives in card 04, this card only needs to feed it real data.
- Let a one-time refiling overwrite the old record — insert a new one; the checklist always reads the
  newest filed row.
- Reproduce Boyland's `project-files.tsx` static list details verbatim into a "real" table — the
  static file names in `real-vs-mock.md`'s "fixed by Peter" sense are demo content only; wire the
  categories to the actual `DocRecord`/`Photo` rows.
- Try to finish SOV/Requisitions/Change-Orders categories in `project-files.tsx` — leave those three
  for their own cards.

## See also
`../contract.md` § 1 "Tables" (DocRequirement, DocRecord, Photo rows), § 2 "Endpoints › Documents" and
"› Photos, tasks", the "Financials"/"Onboarding" section for how `docsSummaryFor()` feeds card 02.
