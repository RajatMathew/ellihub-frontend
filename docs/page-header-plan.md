# Page Header Consolidation — Working Checklist

One page-header system for every list, detail, and form page in the app, at
[`src/app/components/page-header/`](../src/app/components/page-header).

This is the header equivalent of the [table unification](./table-unification-plan.md) work: five
competing header systems shipping side by side, collapsed into one primitive with three presets.

**Status: P0–P6 complete and verified. P7 next.**

Typechecks, lints, and the production build pass. Behaviour is verified in a real browser via the
Playwright auth-mock pattern — the sign-in wall that blocked the table plans is bypassed the way the
existing e2e suite bypasses it, so every claim below was checked against a rendered page, not just a
compile.

## Legend

| Mark | Meaning |
| --- | --- |
| `- [x]` | Done — builds, typechecks, lints, and behaviour checked against the original |
| `- [ ] 🔄` | In progress |
| `- [ ]` | Not started |
| `- [ ] ⛔` | Blocked — reason inline |

Only tick `[x]` after the change has been diffed against its original for behaviour, not just
compiled.

---

## What this is not

Not a redesign. No page gains or loses an affordance except where a finding below says the original
was wrong, and every such case is called out.

Every change either moves a decision **down** a layer — from a page into a preset, from a preset into
the primitive, from a component into route metadata — or deletes a duplicate.

---

## The problem

Five header systems were shipping at once, and a page's header was built by whichever one its author
reached for.

| System | Reach at audit | Verdict |
| --- | --- | --- |
| `Toolbar` primitives | 23 direct importers | Foundation. Over-used directly. |
| `ResourcePageHeader` | 14 call sites | The list standard. Half-broken — see F1. |
| `FormPageToolbar` + `FormPageShell` | 7 wrappers | The healthiest layer. Wrappers are noise. |
| `core/ui` `PageHeader` | **0 production importers** | Best API in the repo. Dev-only. Breaks styling rules. |
| Bespoke `<header>` / `<h1>` | 8+ pages | Off-system entirely. |

Header ownership also had four conventions: the page file, a module component, the route file, and
app chrome. No rule said which.

---

## Findings

Nineteen defects from the read-only audit. Severity is blast radius, not effort.

| ID | Finding | Severity | Status |
| --- | --- | --- | --- |
| F1 | `ResourcePageHeader` never rendered the counts it was given — `showSummary` defaulted false and no caller passed it, so 12 of 14 call sites threaded dead props | Critical | ✅ P0 |
| F2 | No `DetailPageHeader` — ten hand-rolled copies | High | ✅ P3 |
| F3 | Three HR list toolbars re-implemented `ResourcePageHeader` | High | ✅ P2 |
| F4 | Breadcrumbs implemented four separate ways; two trails stack on every detail page | High | ✅ P3 |
| F5 | `RouteDef.breadcrumb` declared, set once, never consumed | High | ✅ P5 |
| F6 | Five different page-title typographies shipping at once | Medium | ✅ P6 |
| F7 | Two page-tab systems (`PageTabs` vs raw Radix `TabsList`) | Medium | ⬜ P3 follow-on |
| F8 | Detail-header permission gating inconsistent — HR ungated, Directory gated | Medium | ✅ P3 |
| F9 | Back-navigation targets and labels drift per entity | Medium | ✅ P5 |
| F10 | `core/ui` `PageHeader` is the best API and unusable — hard-coded colours | Medium | ⬜ P3 follow-on |
| F11 | Nine near-identical wrapper components | Medium | ✅ P2 + P4 |
| F12 | `ProjectToolbarHeader` runs a 25-field mutation inside a header, 297 lines | Medium | ⬜ P3 follow-on |
| F13 | Email and Finance are off the header system entirely | Medium | ✅ P6 (Finance; Email out of scope) |
| F14 | `/app/settings/email-mailboxes` unregistered — no title, no breadcrumb, no sidebar link | Medium | ✅ P5 |
| F15 | Dialogs stand in for create/edit headers with four different title styles | Medium | ❌ out of scope |
| F16 | Feedback renders two competing titles at once | Medium | ❌ out of scope |
| F17 | Header copy and affordances drift entity to entity | Low | 🔄 P4 — affordances settled, titles open |
| F18 | Dead header code still in the tree | Low | ✅ P0 |
| F19 | `.claude/rules/routing.md` contradicted the implementation | Low | ✅ P0 |

---

## Decisions taken

Recorded so they are not relitigated mid-phase.

- **Counts render everywhere.** F1 is fixed by making the summary render, not by deleting the props.
- **Summary wording is `Total {label}: {n}`.** `All {label}: {n}` — what `ResourcePageHeader`
  generated — had **never reached a screen**, because its flag was never passed. The HR list pages
  were the only ones ever to render a summary, so their phrasing is the one that survives. Filtered
  state stays `Showing {n} result(s)`, which already matched HR exactly.
- **One breadcrumb trail.** The global `HeaderBreadcrumbs` owns it. A detail header's eyebrow is
  reduced to a single back link; pages never draw their own trail.
- **P6 covers Finance / Settings / Integrations only.** Email keeps its workspace header (a
  three-pane UI the standard header would fight), auth/help/public keep their own layouts, and
  dialog-based create/edit is left alone.

---

## Architecture

### One primitive, seven regions

Every header in the app decomposes into the same regions. The primitive models them once, all
optional; no preset invents a new one.

```
eyebrow │ title │ status │ ──── │ actions │ overflow │ panel
description
meta
──────────────────────── tabs ────────────────────────────
```

### Two rules that keep it flexible without a prop explosion

**Data for what is structural, `ReactNode` for what is visual.** Actions, metadata, and the summary
are typed data. Status badges and custom descriptors stay `ReactNode`, so a page never needs a new
prop to render a badge the header has not heard of.

**Gating lives on the action.**

```ts
enabled?: boolean | { resource: string; action: string };
```

A boolean covers entity-scoped capabilities the server returns per record
(`project.capabilities.actions.rfq.create`); a `CapabilityRef` resolves through `useAccess().can()`.
An action whose capability is unmet is never rendered — which makes F8 unrepresentable rather than
merely fixed.

### Layout

```
src/app/components/page-header/
  page-header.types.ts        ActionDef, MetaItem, SummaryDef, PanelDef, CapabilityRef
  use-page-header-actions.ts  capability filter + placement split
  page-header-actions.tsx     inline / overflow / primary / panel / trailing
  page-header.tsx             the primitive
  page-header-skeleton.tsx    loading shape
  format-summary.ts           the one summary wording
  list-page-header.tsx        preset
  detail-page-header.tsx      preset
  form-page-header.tsx        preset
  index.ts                    the only public surface
```

---

## Phases

### P0 — Unblock ✅

Fixes that must land before anything is migrated onto a shared component.

- [x] F1 — remove `showSummary`; the summary renders whenever no `description` replaces it
- [x] F18 — delete `HeaderToolbar` (only import was commented out)
- [x] F18 — delete `ToolbarMenu` (zero importers, hard-coded demo tabs)
- [x] F18 — delete orphan `project-edit-form.tsx` (the edit route uses `project-form.tsx`)
- [x] F18 — remove the dead commented `projectHeaderConfig` block
- [x] F19 — rewrite `.claude/rules/routing.md` to match the real architecture

The rules rewrite also encodes two decisions so later phases have something to point at: register
every top-level route in `routeTree`, and **pages must not render their own breadcrumb trail** — they
register a dynamic label via `useBreadcrumbLabel` instead.

### P1 — Build the system ✅

No migrations. Nothing changed visually.

- [x] `page-header.types.ts` — the action, metadata, summary, and panel models
- [x] `use-page-header-actions.ts` — capability filter, placement split
- [x] `page-header-actions.tsx` — inline / overflow / primary / panel / trailing regions
- [x] `page-header.tsx` — the primitive
- [x] `page-header-skeleton.tsx` — loading shape derived from the same props
- [x] `list-page-header.tsx`, `detail-page-header.tsx`, `form-page-header.tsx` — the three presets
- [x] `index.ts` — the single public surface
- [x] Dev-only kit at `/app/ui/page-header`, `isDev`-gated, absent from production builds
- [x] Seven Playwright smoke tests against the kit

Every file is under the 200-line cap.

### P2 — List pages ✅

Seventeen sites onto `ListPageHeader`. **54 files, −405 lines net, 13 components deleted.**

- [x] `ProjectListHeader` — one config-driven component replacing four identical wrappers
- [x] RFQ, Invoice, Purchase Order, Sub Change Order list pages migrated
- [x] Prime Change Orders migrated — keeps its Fieldwire sync line and external link
- [x] HR employees, departments, PTO migrated; their three forked toolbars deleted
- [x] Directory contacts, vendors, GCs migrated; `ContactsPageHeader` deleted
- [x] Catalog cost codes and categories migrated; `CostCodesPageHeader` deleted
- [x] Activity log, lookups, members, template settings migrated
- [x] **`ResourcePageHeader` deleted**

Two additions the migration forced, both driven by a real call site rather than speculation:

- `ActionDef.pending` — Prime Change Orders spins its sync icon; without it the spinner would have
  been silently lost. A semantic flag, not a `className` escape hatch.
- `ListPageHeader.eyebrow` — PTO's list header carries an `Employee Directory` eyebrow.

**Employees keeps `Active Workforce: {n}` verbatim**, passed through `description`. That string is
not a synonym for the row count — it asserts the list is scoped to active employees — so it was not
normalised. If that scoping claim is wrong, it is a copy bug that predates this work.

### P3 — Detail pages ✅ (headers) / 🔄 (follow-ons)

The largest cluster, and where the permission gap lived. All ten hand-rolled detail headers are gone.

- [x] Directory: vendor, GC, contact detail toolbars → `DetailPageHeader`
- [x] HR: employee, department, PTO detail toolbars → `DetailPageHeader`
- [x] Project: invoice, purchase order, RFQ, sub change order — headers were inlined in the page
      files and are now one component call each
- [x] **F8 — gating gap closed.** HR detail headers rendered Edit and Delete to anyone who could
      read the record. Now declared against `employee:update` / `employee:delete` and
      `department:update` / `department:delete`, both verified against
      `elli-core/src/lib/permissions.ts`. Covered by `tests/e2e/detail-page-header.spec.ts`.
- [x] F4 — the second breadcrumb trail is gone from every detail header; the eyebrow is a back link
- [ ] F9 — back links are consistent in *form* but still hand-typed; route derivation lands in P5
- [ ] F7 — one tab mechanism; `PageTabs` in the header, Radix `Tabs` for in-card only
- [ ] F12 — lift `ProjectToolbarHeader`'s stage mutation out of the header
- [ ] F10 — delete `core/ui` `PageHeader` and `SectionHeader` once their API is absorbed

Two additions the migration forced:

- `ActionDef.disabledReason` — Department's delete is disabled while it still has employees, and the
  original explained why in a tooltip. Without this the explanation would have been lost.
- `enabled` now accepts an **array**, requiring every condition. PTO's Edit needs both a pending
  request and the `leave:create` permission; a single `boolean | CapabilityRef` could not say that.
  `leave` has no `update`/`delete` action, so `create` remains the module's convention.

Three deliberate behaviour changes, all consolidating toward the majority:

- The duplicate `Edit` that appeared **both** inline and in the overflow menu (vendor, GC, employee,
  department, invoice, PO) is now inline only.
- RFQ's overflow trigger was a labelled `Actions ▾` button; it is now the icon trigger every other
  detail page uses.
- Eyebrow letter-spacing was `tracking-widest` in Directory/HR and `tracking-normal` in project
  pages. It is now `tracking-widest` everywhere.

### P4 — Form pages ⬜

- [ ] `FormPageHeader` adopted inside `FormPageShell`
- [ ] Collapse six per-entity form toolbars and the no-op `ProjectFormToolbar` pass-through
- [ ] F17 — settle title copy (`Add New Vendor` vs `Add General Contractor`), the cancel icon, and
      the mock-data button
- [ ] Delete `FormPageToolbar`

### P5 — Route metadata ⬜

- [ ] Extend `RouteDef` with `header?: { kind, entityLabel, parentLabel }`
- [ ] F5 — make `HeaderBreadcrumbs` read `RouteDef.breadcrumb` instead of its three hard-coded maps
- [ ] F9 — derive back targets from the route so they are never hand-typed
- [ ] F14 — register `/app/settings/email-mailboxes` in `routeTree`
- [ ] Retire `formRouteTitles` in favour of `entityLabel`

### P6 — Remaining surfaces ⬜

Scope decision: **Group A only.**

- [ ] Finance — checking register, payment conflicts (F13, F6)
- [ ] Settings — shared mailboxes (F6)
- [ ] Integrations — QuickBooks integration page

Out of scope by decision: Email (workspace UI), auth / help / public (deliberately different),
dialog-based create/edit (F15, F16).

### P7 — Enforcement ⬜

Without this the plan is a cleanup, not an architecture.

- [ ] Move the `Toolbar` primitives inside `page-header/`
- [ ] ESLint `no-restricted-imports`: nothing under `src/modules/**` may import them directly
- [ ] Document the header rules in `.claude/rules/`

---

## Verification

Run after every phase. A phase is not done until all four pass.

| Check | Command | P0 | P1 | P2 |
| --- | --- | --- | --- | --- |
| Types | `npx tsc -b` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lint (vs baseline) | `npm run lint` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Build | `npm run build` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| E2E | `npx playwright test` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Lint baseline is 21 problems (12 errors, 9 warnings)**, all pre-existing and none in touched files.
Verified by stashing the working tree and re-running. A phase that changes this number has
regressed.

**E2E baseline is 33 failures**, all pre-existing: 23 email, 2 `invoice-form`, 4
`project-commercial-forms`, `monthly-bills-decimal-totals`, `project-edit-form`, 2 `responsiveness`.
The suite is flaky under parallelism — always re-run a new failure serially before treating it as a
regression.

Specs that directly exercise migrated pages, all passing: `page-header-kit`, `list-tables`,
`directory-forms`, `hr-forms`, `bulk-delete`, `members-bulk-delete`, `employees-mobile-bulk`,
`rfq-bulk-delete`, `files-bulk-delete`, `detail-page-header`, `route-metadata`, `standalone-page-headers`.

### Notes for whoever runs this next

- **Prettier is not enforced.** `npm run lint` is eslint-only, and 587 files fail
  `prettier --check` on a clean tree. Never run `prettier --write` across `src/` — it rewrites
  hundreds of untouched files and buries the real diff. Format only the files you created.
- **Source files are CRLF.** Multi-line `perl -0pi` patterns written with `\n` will silently match
  nothing. Verify a scripted edit landed before moving on.
- **The app is behind a sign-in wall.** Browser verification goes through Playwright, which mocks
  `/api/v1/auth/` and `/api/v1/users/me/access` — see any existing spec for the pattern.
- **A dev-tools overlay injects a button labelled `Open more actions menu`**, which fuzzy-matches
  `getByRole('button', { name: 'More actions' })` and trips strict mode. Use `exact: true`.
- **The kit route lazy-loads.** On a cold Vite cache the first workers wait ~20s for that chunk,
  which is why `page-header-kit.spec.ts` sets a 90s describe timeout.

---

## Open questions

- **`Active Workforce`** — does the employee list actually filter to active employees? If not, the
  string has been misleading since before this work and should change to `Total Employees`.
- **Non-sticky headers** — `sticky` is on by default and neither the list nor detail preset exposes
  it. Correct for real pages, which have one header each. The prop gets added when a page needs it,
  not speculatively.
