# Table Consistency — Working Checklist

Second pass over the shared table kit at
[`src/app/components/data-table/`](../src/app/components/data-table).

The [first pass](./table-unification-plan.md) collapsed six competing table systems into one kit and
put all 17 resource lists on it. Its scope note says **"theme and visual changes"** were deliberately
out of scope. This is that work.

**Status: complete and verified.** All six phases landed. Typechecks, lints clean, production build
passes — and the components have now been rendered and measured (see *Verification*, below), which
found three defects that reading the code had not. Typechecks, lints clean, production build passes.
Not yet verified in a browser — the dev server boots but the sign-in wall needs real
credentials, the same blocker the first-pass plan carries.

The API contract lives in [`docs/resource-list-tables.md`](./resource-list-tables.md) and must be
updated as each phase lands.

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

Not a rewrite. The state layer is sound: filters are declared as data, URL state and request params
are derived from the schema, no module calls `useReactTable`, and an ESLint rule keeps it that way.

Every change below either moves a decision **down** a layer — from a page into the kit, from the kit
into a primitive, from a primitive into a token — or deletes a duplicate. `DataTable` gains props; it
loses none.

---

## Root causes

Forty-four findings trace back to four decisions.

| | Cause | Consequence |
| --- | --- | --- |
| **RC-1** | `cardHeaderVariants.themed` styles its children by descendant selector (~15 `[&_button]:…` rules) | 72 `!important` utilities across 28 files |
| **RC-2** | The toolbar height the design uses (32px) is not in the control size scale (`sm` 28 / `md` 34 / `lg` 40) | 11 hand-written override constants in 7 files |
| **RC-3** | Columns and cells have no factories | 1,814 LOC of near-identical cells; 10 copies of one dropdown; 28 distinct width values |
| **RC-4** | The kit owns state and rendering but not the query | 14 of 15 server-paginated lists wipe to skeletons on every filter change |

---

## Phase 1 — Surface tokens and the toolbar size ✅

Unblocks every other phase. Until the token scope exists, later phases would keep writing the
`!important` strings they are meant to delete.

**Touches ~30 files. Risk: medium — the card-header change reaches non-table cards too.**

- [x] Fix the malformed class at [`button.tsx:317`](../src/app/components/ui/button.tsx) —
      `'w-7 h-7 p-0 [[&_svg:not([class*=size-])]:size-3.5'` has a stray `[` and an unbalanced pair, so
      `size="sm" mode="icon"` never gets its icon sizing **(E4)**
- [x] Add the `[data-surface='card-header']` token scope to
      [`globals.css`](../src/app/styles/globals.css) — remaps `--background`, `--input`,
      `--foreground`, `--muted-foreground`, `--accent` for the subtree
- [x] Strip the `[&_button]:…` / `[&_svg]:…` / `[&_a]:…` descendant rules from
      `cardHeaderVariants.themed` in [`card.tsx`](../src/app/components/ui/card.tsx) **(RC-1)**
- [ ] 🔄 Audit the non-table card headers that relied on those rules — detail cards, overview tabs,
      division board — and confirm each still reads correctly in all four themes.
      *Static audit done (see "Not verified" below); the visual pass needs credentials.*
- [x] Add `size="toolbar"` (32px) to the shared scales:
  - [x] `Button` — [`button.tsx`](../src/app/components/ui/button.tsx)
  - [x] `Input` / `InputWrapper` — [`input.tsx`](../src/app/components/ui/input.tsx)
  - [x] `SelectTrigger` — [`select.tsx`](../src/app/components/ui/select.tsx)
  - [x] `ToggleGroup` — [`toggle-group.tsx`](../src/app/components/ui/toggle-group.tsx)
  - [x] `InfiniteSearchSelect` — [`infinite-search-select.tsx`](../src/app/components/ui/infinite-search-select.tsx)
  - [x] `InfiniteMultiSearchSelect` — [`infinite-multi-search-select.tsx`](../src/app/components/ui/infinite-multi-search-select.tsx)
- [x] Fix `min-h-8.5` → fixed height on the multi-select trigger, so a wrapping badge cannot grow the
      header and push the table down **(B4)**
- [x] Delete the 11 override constants **(B2)**:
  - [x] `table-card-header.tsx` — `controlShellClassName`, `selectTriggerClassName`
  - [x] `data-table-filters.tsx` — `dataTableFilterTriggerClassName`, `dataTableFilterPlaceholderClassName`, `dataTableDateInputClassName`
  - [x] `files-list-filters.tsx` — `headerInputControlClassName`, `headerSelectTriggerClassName`, `headerToggleItemClassName`
  - [x] `monthly-bills-filters.tsx` — `tableHeaderMultiSelectTriggerClassName`
  - [x] `monthly-bills-subcontractor-page.tsx` — `tableHeaderActionButtonClassName`
  - [x] `monthly-bills-column-toggle.tsx` — `tableHeaderActionButtonClassName`
  - [x] `prime-change-order-list.tsx` — `costInputClassName`
- [x] One header token for sortable and non-sortable headers alike in
      [`data-grid-column-header.tsx`](../src/app/components/ui/data-grid-column-header.tsx) — currently
      `text-secondary-foreground` vs `text-accent-foreground` in the same row **(A4)**

**Closes:** A4 · B1 · B2 · B4 · B5 · E1 (partly) · E4 · RC-1 · RC-2

### Result

| | Before | After |
| --- | ---: | ---: |
| `!important` utilities on card-header tokens | 72 | 19 |
| Files hardcoding card-header control classes | 28 | 25 |
| Control override constants | 11 | 0 |
| Malformed Tailwind classes | 1 | 0 |

The 19 remaining `!important` utilities are all on **headings and links** in card headers, which
`cardHeaderVariants` still reaches by descendant selector on purpose — they carry no palette of their
own. Phase 2 owns the title slot and clears them.

### Landed beyond the original list

- **Bulk-action buttons normalised to `size="toolbar"`** across all 12 call sites, and the bulk bar
  now sizes whatever it is handed. This was listed under phase 2 but the height mismatch was
  reachable from here, so it went in with the rest of the sizing work **(E1)**.
- **Select-filter skeletons inherit the control's declared width** instead of a hardcoded
  `sm:w-44` **(B6, listed under phase 3)**.

### One visible change to expect

Bulk **Delete** buttons previously rendered *transparent*. `[&_button]:bg-transparent` in the header
variant was overriding `variant="destructive"`, so the destructive styling never applied and Delete
looked like a ghost button. With the descendant rules gone it renders as a real destructive button.

This is a fix, not a regression — but it is the one change on screen that is not simply "things line
up now", so it is worth looking at first.

### Not verified

The token scope is confirmed present in the built CSS and the descendant rules are confirmed gone
from it. What could not be checked is how it *looks*, in each of the four themes, because of the
sign-in wall. The at-risk surface was audited statically: only `outline`, `ghost` and `primary`
buttons appear inside any card header, and the scope remaps every token all three read
(`--outline-button-*`, `--accent`, `--accent-foreground`, `--background`, `--foreground`).
`destructive`, `secondary`, `mono`, `dashed` and `dim` appear in none.

---

## Phase 2 — The header contract ✅

Placement must be settled before new filter kinds are added, or each new kind reopens the question.

**Touches ~15 files. Risk: low.**

- [x] Three explicit header slots — *title* / *filters* / *trailing* — replacing the free-form wrap.
      Clear is pinned to trailing at every breakpoint, in every header variant **(H1)**
- [x] Control order becomes a property of the filter kind, declared once in the renderer. Nothing
      outside the kit chooses it **(H2)**
- [x] `title` accepts a string and one component renders it; keep the `ReactNode` overload for the RFQ
      scroll-tabs case **(A3)**
- [x] Merge `ProjectFilterTabs` into `TableCardHeaderTabs`, keeping the wrapping behaviour as a prop
      **(D5)**
- [x] The bulk bar renders its actions through a slot that applies the toolbar size, so a page cannot
      pass the wrong one — *landed in phase 1* **(E1)**
- [x] Active-filter chip row, derived from `state.rawValues` and the schema. Each chip clears its own
      filter **(D4)**
- [x] `<Reserve when>` wrapper generalising the Clear button's `invisible` + `aria-hidden` +
      `tabIndex={-1}` pattern; apply to every conditional header control **(G5)**
- [x] **Filtered-empty state** — `empty` gains a `filtered` variant, chosen from `hasActiveFilters`,
      with a Clear-filters action by default. Today a filter returning zero rows shows the first-run
      message and the wrong call to action, on all 17 lists **(J1)**
- [x] The kit styles `empty.icon` instead of each call site retyping `size-10 text-muted-foreground/50`
      — two of twelve have already drifted to `/40` **(J7)**

**Closes:** A3 · D4 · D5 · E1 · G5 · H1 · H2 · J1 · part of J7

### What changed

**`TableCardHeader` now owns the layout.** Three named slots — `title`, `actions`, `trailing` — with
`TableCardHeaderFilters` (wraps freely) and `TableCardHeaderTrailing` (never wraps, `ms-auto`).
Callers no longer compose their own toolbar, so Clear cannot land on the left again. All five headers
in the app went through it: the filter header, the bulk bar, files, monthly-bills subcontractor and
monthly-bills summary.

**Control order is data.** `CONTROL_ORDER` in `data-table-filters.tsx` maps kind → rank, and the
renderer sorts by it. Schema order no longer decides what a header looks like.

**`title` takes a string.** `TableCardHeaderTitle` renders it, with `titleDescription` for a second
line and a skeleton driven by `list.isInitialLoading`. Nine pages dropped their hand-written spans;
Activity Log's two-line title and the two count-in-title lists (lookup, categories) went with them.
The `ReactNode` overload stays for RFQ's scroll-arrow tab strip, which is genuinely its own thing.

**Filter chips.** `active-filter-chips.ts` derives them from the schema; `DataTableFilterChips`
renders the row. `search` and `tabs` are excluded — they show their own value — so a list with only a
search box never grows a row. `hidden` filters finally surface: a deep link that narrows a list can
now be seen and removed. Needed one schema addition, `label?: string` on `FilterBase`.

**Filtered-empty.** `DataTable` now owns `clearAll` (it was in the header, and the empty state needs
the same action) and picks between `empty` and a filtered variant. Pages can override the copy via
`filteredEmpty`; the icon and the Clear-filters button come from the kit.

**`empty.icon` is a component, not an element.** All 16 call sites converted. Activity Log's bespoke
framed icon went with it — it was the only list not using a plain Lucide glyph.

**`ProjectFilterTabs` deleted.** Merged into `TableCardHeaderTabs`, which took its better responsive
behaviour (wrap below `sm`, one line above, `px-3 sm:px-4`). One consumer, RFQ, updated.

### New files

| File | Why |
| --- | --- |
| `data-table/active-filter-chips.ts` | Chip derivation. Separate from the component so fast refresh works. |
| `data-table/data-table-chips.tsx` | The chip row. |
| `ui/search-select-size.ts` | Shared trigger sizes, extracted in phase 1 for the same reason. |

### A note on Prettier

Formatting the touched modules swept 18 files this session that had no change of mine in them — the
exact failure the first-pass plan warns about. All 18 were reverted after confirming, against the
phase-1 stash, that each was identical to `HEAD` beforehand, so nothing was lost. **Format individual
files, never a module tree** — the import-sorting plugin makes non-whitespace edits, so
`--ignore-all-space` will not tell you a sweep was harmless.

---

## Phase 3 — Complete the filter schema ✅

Every remaining bespoke header exists because a kind is missing. Add the kinds, delete the headers.

**Touches ~12 files, 2 deleted. Risk: medium — files is the sanctioned exception; re-verify its three
render hatches.**

- [x] `f.multiSelect` / `f.infiniteMultiSelect` — plain and infinite-backed. Comma-joined URL value;
      participates in `hasActiveFilters` and `clearFilters`. Landed later than the rest of phase 3,
      once purchase orders and invoices needed one — see below **(B3)**
- [x] `f.dateRangePopover` — one trigger, presets, apply/clear. Replaces both the two-input
      `f.dateRange` and the files popover **(F3)**
- [x] `f.toggleGroup` — view mode, scope toggles **(F3)**
- [x] `f.numberRange` — retires the only `f.custom` in the app, whose own comment asks for it **(J7)**
- [x] `scope` on `f.search`, rendered inline in the control rather than as a focus-triggered overlay
      **(F2, F3)**
- [x] Skeleton inherits the control's declared width instead of a hardcoded `sm:w-44` —
      *landed in phase 1* **(B6)**
- [x] Move files' search from the page toolbar into the card header **(F1)**
- [x] Migrate files to a filter schema; delete `files-list-filters.tsx`
- [ ] ⛔ Migrate monthly-bills' header to a schema; delete `monthly-bills-filters.tsx`

**Closes:** F1 · F2 · F3 · J7 · B6 (landed in phase 1)
**Deferred:** B3 — see below.

### What landed

Five additions, each with a real consumer. `f.custom` now has **zero** uses app-wide.

| Addition | Consumer |
| --- | --- |
| `f.dateRangePopover` | Files' date filter — one trigger, presets, apply/clear |
| `f.toggleGroup` | Files' list/grid view switch |
| `f.sortSelect` | Files' sort control, writing through `setSort` |
| `scope` on `f.search` | Files' folder/global search |
| `f.numberRange` | Prime change orders' min/max cost — retired the last `f.custom` |

**`persistent` on `FilterBase`.** A control can now live in the filter row, reach the URL and render
in order without being a filter: `clearFilters` skips it and `hasActiveFilters` ignores it. Files'
view toggle and sort select need exactly this — clearing a filter set must not throw the user back to
list view or reset the sort. `f.sortSelect` sets it automatically.

**Multi-key filters generalised.** `filterUrlKeys` handles `dateRangePopover`, `numberRange` and a
search's scope key; `apiParams` follows. A sort select owns no key at all — it writes through
`setSort`, so sorting stays in one place whether it came from the header control or a column header.

**Files' header is now schema-driven.** `files-list-filters.tsx` is deleted (219 LOC). Its search
moved out of the page toolbar and into the card header, where every other list's search lives, with
its folder/global scope as an inline segment rather than a panel that appeared on focus and covered
the first table row. Files still renders its own body — that part was always the right call.

**`DataTableFilters` derives its own schema.** Modules pass `state` and, optionally, a live-data
override. The one unavoidable cast lives in the kit rather than at each call site.

### `f.multiSelect` — deferred here, built later ✅

Its only would-be consumer is monthly-bills, and monthly-bills is not going onto `useListState`.

It runs on `useInfiniteMonthlyBillsQuery` — infinite scroll, no pagination, no sort — while
`useListState` requires a sort config and emits `page`/`size`/`sortBy`/`sortOrder`. This is the same
reason `project-list` was left off the kit in the first pass, and the same reason both plan documents
give for not bending the kit around one screen. Building a filter kind with no consumer would break
the rule the kit has followed throughout: *every capability was added because a real page needed it.*

**B3 is therefore restated, not closed.** The real defect is narrower than the audit implied: it is
not "the schema lacks a kind", it is **monthly-bills' filters are component state, so a filtered view
cannot be linked or restored**. That is a monthly-bills question — URL state for an infinite-scroll
matrix editor — and belongs with Track C, not here. Its header controls did get the phase-1 and
phase-2 treatment: the `!important` strings are gone and Clear is in the trailing slot.

Build `f.multiSelect` the day a *paginated* list needs one.

#### That day came ✅

Purchase orders and invoices needed to filter by several vendors at once — both are paginated, both
were already on `useListState`, so the kind was built to the shape this section specified: comma-joined
URL value, full participation in `hasActiveFilters` and `clearFilters`. Two builders, `f.multiSelect`
(fixed options, searched locally) and `f.infiniteMultiSelect` (paginated query), both rendering the
`InfiniteMultiSearchSelect` that phase 1 had already built and only monthly-bills was using.

Three things came out of it that the original entry did not anticipate:

- **CSV is required, not chosen.** `useUrlParamPatch` writes with `URLSearchParams.set` and the API
  reads with Hono's `c.req.query()` — the first cannot write a repeated param, the second returns only
  the first value of one. Both ends had already independently landed on CSV (`csvNanoIdsSchema`,
  `excludeIds`); the kind just made it a convention instead of a coincidence.
- **The value stays a `string`.** Widening `rawValues` to `string | string[]` would have rippled through
  `clearFilters`, `hasActiveFilters`, the chips and every `clientPredicate`. Instead `state.listValues`
  exposes the parsed list beside the raw value, and `setFilterListValue` serializes on the way back.
- **Selected labels cannot come from the rows.** The single-value pickers recovered their trigger label
  by finding a matching row — which already broke on deep links, and breaks reliably once a selection
  can contain a vendor that owns no row on this page. `useOptionsByIds` resolves them against the source
  endpoint instead, which needed an `ids` filter on the vendor and purchase-order lists.

**Monthly-bills is still not migrated** — the blocker above is unchanged, it runs on infinite scroll
with no sort while `useListState` requires a sort config. It can now adopt the kind whenever that is
resolved; the duplicated `tableHeaderMultiSelectTriggerClassName` it owns has moved into the kit.

### One judgement call to review

Files' search moved into the card header. The plan flagged this as an open question — it previously
sat beside Export / New Folder / Upload, where it read as a page-level action spanning folders, and
that had a real argument for it. It moved because consistency across lists was the explicit ask, and
because the scope segment now says which of the two it is doing. **Reversible**: the schema keeps the
scope either way; only the render location would change back.

---

## Phase 4 — Column and cell factories ✅

Track A of the first-pass plan, now with the evidence it was deliberately waiting for.

**Touches ~25 files. Largest LOC win. Risk: low — mechanical, one file at a time.**

- [x] `col.text` / `currency` / `date` / `status` / `link` / `actions` / `custom`, each owning
      alignment (header **and** cell), width token, skeleton preset and tabular numerals
- [x] `align` fixes the silent bug: `text-right` in `headerClassName` is inert on a **sortable** column,
      because `DataGridColumnHeader` wraps the button in a flex box. Four currency columns are
      right-aligned in the cell and left-aligned in the header today **(D1)**
- [x] A named width scale replacing 28 free-form values — 12 `min-w-*`, 9 fixed `w-*`, 7 percentages
      **(D2)**
- [x] Derive `enableSorting` from `state.sortFields`; drop the per-column flag, so a column can never
      render a sort chevron that does nothing **(D3)**
- [x] `<RowActions items />` — one trigger, one accessible name, `stopPropagation`, `align="end"`,
      permission-gated items, destructive separator. Replaces 10 near-identical copies **(E2)**
- [x] `col.actions()` owns column width, button size and skeleton together — currently 2 button
      heights, 4 column widths and 4 skeleton spellings **(E3, H3)**
- [x] `<StatusBadge status tone />` plus a single `statusTone()` resolver; retire the 5 duplicated
      variant maps. 125 badge call sites split 60 `light` / 16 `outline` for the same job
      **(C1, C2, C3)**
- [x] `col.link()` renders the primary cell as a real link — one interaction model for "open this
      record", and the keyboard path files currently lacks **(J2, J3)**
- [ ] ⛔ A generic mobile card derived from the factories, so all 17 lists get one instead of 3, at one
      breakpoint instead of two **(J4)**
- [ ] 🔄 Retrofit all 11 column files

**Closes:** C1 · C2 · C3 · D1 · D2 · D3 · E2 · E3 · H3 · RC-3
**Partly:** J2 · J3 (the mechanism exists; Files still navigates by row click)
**Deferred:** J4 — see below.

### The bug this phase existed to fix

`align` now lives on the column's meta and drives the head and the body with the
*right rule for each*: `justify-*` on the header's flex row, `text-*` on the cell. The head could
never use `text-align` — a sortable header renders a flex box, which ignores it — which is why four
currency columns were right-aligned in the body and left-aligned in the head, and why the same
`headerClassName` worked on a non-sortable column and silently failed on a sortable one. The skeleton
row aligns with them, so a loading row no longer sits left of the data it becomes.

`invoice.totalAmount`, `primeChangeOrder.totalCost`, `purchaseOrder.total` and
`subChangeOrder.amount` are the four that were wrong.

### What landed

| Piece | Replaces |
| --- | --- |
| `col.*` in `data-table/columns.tsx` | Hand-written `ColumnDef` objects restating align, width, skeleton and sortability |
| `RowActions` | 10 near-identical dropdowns |
| `StatusBadge` + `statusTone()` in `status-tone.ts` | 5 duplicated status → variant maps |
| `COLUMN_WIDTHS` | 28 free-form width values across 3 parallel systems |

**Sorting is derived.** `useListTable` reads `state.sortFields` and enables sorting only on columns
whose id the list declared. A column can no longer render a sort control that responds to clicks and
changes nothing. An explicit `enableSorting` still wins.

**One menu per record, not one per render site.** Employees, purchase orders and sub change orders
each had a mobile card *and* a table column rendering their own copy of the same menu. They now share
one `RowActions` definition. `col.actions({ cell })` exists for exactly this: the project lists read
their permissions from a query, which is a hook call and cannot live in a plain `items` function.

### Numbers

| | Before | After |
| --- | ---: | ---: |
| `*-column-cells.tsx` LOC | 1,814 | 1,393 |
| Row-action dropdown implementations | 10+ | 1 |
| Status → variant maps | 5 | 0 |
| Currency columns misaligned | 4 | 0 |
| Dropdown scaffolds left in column files | 9 | 1 |

### Three lists keep their own actions cell — deliberately

- **Files** builds a menu with pin / set-primary / rename / export / delete, gated on five separate
  permissions. Genuinely richer than a menu of links.
- **PTO** renders inline approve and reject buttons *beside* the menu. Its menu is now `RowActions`;
  the column stays hand-written because the cell is not only a menu.
- **Members** uses `MemberActionsMenu`, which has a role sub-menu.

Each is a real exception, not an unfinished migration.

### `col.link` is available but Files still navigates by row click ⛔

The mechanism for J2/J3 shipped — `col.link()` renders a real `<Link>`, so the primary cell is
keyboard-reachable and supports middle-click. What has *not* happened is pointing Files' name column
at it and dropping the `<tr onClick>`.

That is a behaviour change to the one screen that navigates by row rather than by link, and it wants
a click-through before it lands. Left open rather than done blind.

### Generic mobile card not built ⛔

The three lists that have one — employees, purchase orders, sub change orders — each hand-build a
card with a different layout, not a different *implementation* of the same layout. Deriving one from
the factories needs a decision about what a card shows when a list has ten columns, and that is a
design question rather than a refactor. J4 stays open with its reasoning rather than being guessed at.

---

## Phase 5 — The no-jump pass ✅

Deliberately after phases 1–4: fixing jumps first would only stabilise layouts that are about to
change.

**Touches ~20 files. Risk: low — additive.**

- [x] `useListQuery` wrapper pinning `placeholderData: keepPreviousData`; migrate all 15
      server-paginated list hooks. Only `useVendorsQuery` has it today, which is why every other list
      wipes to skeletons on a filter change **(G1)**
- [x] The refresh indicator becomes an overlay or a permanently reserved strip — never a `min-h-9` bar
      inserted into flow between the table and the footer **(G2)**
- [x] Body height held from the last render that had rows, falling back to
      `pageSize` on first load **(G3)**
- [x] `scrollbar-gutter: stable` on the table scroller; drop the second, unexpected `overflow-x-auto`
      on `CardFooter` **(G4)**
- [x] Audit the header for any control that mounts conditionally; wrap in `<Reserve>` from phase 2

**Note:** categories and lookup run `mode: 'client'` and are genuinely exempt from `keepPreviousData`
— one fetch, in-memory filtering, the query key never changes. Do not "fix" them.

**Closes:** G1 · G2 · G3 · G4 · G5 · RC-4

### What landed

**`useListQuery`.** The kit could not fix G1 from the inside — it owns the URL state and the
rendering, but each module wrote its own `useQuery`. It now owns the query too, thinly: one option
pinned, everything else passed through. Fifteen hooks migrated.

**The refresh indicator overlays instead of inserting.** It was a 36px bar in the flow between the
table and the footer, so every background refetch moved the pagination row down and back. `Card`
gains `relative` so an overlay inside it has a defined containing block.

**The body remembers its height.** Measured from the last render that held rows, held while the next
set loads, released as soon as rows are back — otherwise an empty state would be padded out to the
height of the last full page. Measured rather than counted, because rows are not one height: a
two-line name cell is taller than a date.

**The skeleton still draws `pageSize` rows, deliberately.** With the previous page kept, skeletons
only appear on a genuine first load, where the page size is the only number available. The original
finding assumed they appeared on every filter change — which was true, but because of G1, not because
of the count.

### One jump this pass deliberately accepts

The active-filter chip row added in phase 2 appears when the first filter is applied, which moves the
table down by its height. That is a single transition in direct response to a click, and the row is
information the user just asked for — unlike the refresh indicator, which appeared repeatedly with no
input. Reserving the space permanently would put an empty band on every list to avoid one expected
movement. Left as is.

---

## Phase 6 — Detail tables, dead code, gates ✅

Cleanup last, so nothing is deleted that a later phase turns out to need.

**Touches ~20 files, 8 exports deleted. Risk: low — all zero-consumer verified.**

- [x] `<DetailTable columns rows />` built on the grid's spacing and colour tokens. The raw `ui/table`
      primitive renders `th` at `h-12` with no header background against the grid's `h-10 bg-muted/40`
      — two table visual languages shipping side by side **(A1)**
- [x] Migrate the 5 raw-`<table>` detail blocks (Track B of the first-pass plan) **(I3)**
- [ ] ⛔ Migrate the schedule-tracker and payment-conflict tables
- [x] Fix the empty row's `colSpan` — `getAllColumns()` counts hidden columns while the skeleton row
      correctly uses `getVisibleFlatColumns()`; affects purchase orders for users without RFQ read
      **(J5)**
- [ ] ⛔ Resolve column visibility: one kit component, or delete both implementations. It exists twice
      and is reachable through neither **(J6)**
- [x] Delete the zero-consumer exports **(I1)**:
  - [x] `data-grid-column-filter.tsx` (131 LOC)
  - [x] `data-grid-column-visibility.tsx` (46 LOC)
  - [x] `ui/sortable.tsx`
  - [x] `DataGridContainer`
  - [x] `DataGridTableRowSelect` / `DataGridTableRowSelectAll` — superseded by `data-table-selection.tsx`
  - [x] `DataGridTableLoader` and the unused `loadingMode: 'spinner'` branch
- [x] `tableAriaLabel` becomes required on `DataGridProps` — files bypasses `DataTable` and so bypasses
      the accessible-name rule **(I2)**
- [x] Land the lint gate and update the docs

**Closes:** A1 · I1 · I2 · I3 · J5
**Deferred:** J6, and two of the four proposed lint gates — see below.

### What landed

**`DetailTable`.** Four raw `<table>` blocks migrated: purchase order line items, RFQ deliverables,
RFQ vendor quotes, and both tables on the sub change order detail page. The CSV/XLSX preview in
`file-preview-dialog.tsx` keeps its own — it renders arbitrary uploaded columns, which is what the
first pass already sanctioned.

**`ui/table`'s defaults now match the grid's.** Rather than migrate twelve more files, the primitive
itself moved: header rows are `h-10` with `bg-muted/40` and the grid's foreground, cells are
`px-4 py-3`. That closes the "two table visual languages" finding for every remaining consumer at
once. Monthly bills was already overriding every header to `h-10`, so it can drop those.

**`colSpan` counts visible columns**, so the empty state is no longer one cell too wide for users a
permission has hidden a column from.

**`tableAriaLabel` is required.** It immediately caught the one list that had gone without — Files,
which renders `DataGrid` directly.

**Eight zero-consumer exports deleted**, ~180 lines.

### The lint gate, and the three that did not land

Only one of the four proposed gates is in: **no `!important` Tailwind utilities in
`src/modules/**`**. It is the one that encodes the actual lesson.

Getting it right took two corrections worth recording:

- The first selector matched nothing. It reported zero violations on a tree that had nineteen —
  a false clean bill. **A gate that has never been seen to fail is not a gate.** It now has a
  recorded probe: three forms of the violation, three errors.
- Once it worked, it found nineteen real hits in detail cards — headings and one button still
  fighting the descendant rules that tables were freed from in phase 1. Fixed rather than
  exempted; the overrides were unnecessary once the token scope existed.

One suppression, in `email-message-body.tsx`: it builds a CSS stylesheet for a message's shadow
root, where `!important` is CSS holding sender markup back, not a Tailwind class.

**`table-card-header-foreground` is kit-only ⛔** — tried, rejected. It fires on 24 detail-card
titles that legitimately use the token, and the rule cannot tell a heading from a control.

**List queries go through `useListQuery` ⛔** and **no `ColumnDef` literals in modules ⛔** — both
want a custom rule rather than a selector, since the useful version is "a `useQuery` whose key
contains list params" and "a column object outside a factory". Worth writing; not worth a selector
that half-works, which is the mistake above.

### Two items closed as "not this"

**Schedule tracker and monthly bills keep `ui/table` ⛔.** Both are editable grids — inline inputs,
grouped rows, bulk save — not static tables. `DetailTable` cannot express them and the list kit is
the wrong tool, which is what Track C said in the first place. They now inherit the aligned
primitive, so they match visually without being migrated.

**Column visibility ⛔.** Still a product question — should users get column control at all? The
grid's own `DataGridColumnVisibility` is deleted as dead, monthly bills keeps its bespoke popover,
and `columnVisibility` stays what it actually is: a permission-driven prop.

---

## Guardrails

The first pass held because it left an ESLint rule behind, not because it left a document behind.

- [x] **No `!important` utilities in `src/modules/**`.** A `no-restricted-syntax` rule on `!`-prefixed
      Tailwind classes in JSX class strings. Reaching for one means a primitive is missing a variant.
- [ ] ⛔ **`table-card-header-foreground` is kit-only.** Allowed in `components/data-table/**` and
      `table-card-header.tsx`; banned elsewhere.
- [ ] ⛔ **List queries go through `useListQuery`.** Blocks a new module from reintroducing G1.
- [ ] ⛔ **No `ColumnDef` object literals in `src/modules/**`** once phase 4 lands — a hand-written column
      means a factory is missing.
- [ ] **One layout-stability Playwright spec per list.** Measure the card's bounding box, apply a
      filter, wait for the network to settle, measure again; the height must not change beyond the
      row-count delta. This is the only assertion that actually proves G1–G5.
- [ ] **A control-height assertion on one representative header** — every control in the toolbar
      reports the same `offsetHeight`. Catches a B1 regression in one line.
- [x] Extend [`resource-list-tables.md`](./resource-list-tables.md) with the new filter kinds, the
      column factories and the surface-token rule.
- [ ] Mark Track A and Track B closed in [`table-unification-plan.md`](./table-unification-plan.md).

---

## Open questions

- [ ] **Density.** Four lists set `dense: true` and thirteen do not, with no stated rule. Compact by
      default above ~6 columns, or an explicit per-list call?
- [ ] **Files' search placement.** Moving it into the card header makes it consistent, but it currently
      sits beside Export / New Folder / Upload, where it reads as a page-level action across folders.
      This is the one finding where the current behaviour has a real argument for it.
- [ ] **Column visibility.** Do users get column control at all? If not, `columnVisibility` stays what
      it actually is — a permission-driven prop.
- [ ] **Sticky headers.** Supported by the grid, enabled nowhere, while the page-size selector offers
      100 rows.

---

## Verification

The sign-in wall blocks the app itself, so the components were mounted in a temporary standalone
Vite entry — real components, mock data, no app shell and no auth — and driven at 320, 375, 768 and
1280px in all four themes. The harness was deleted afterwards; what follows is what it established.

### Confirmed working

- [x] **No horizontal page overflow at any width**, down to 320px. Wide tables scroll inside their
      own container, which is the intent.
- [x] **Every header control is 32px** and they align on one row.
- [x] **Clear sits at the right edge at every breakpoint**, including mobile, where the header
      stacks — the original complaint.
- [x] **Currency headers are right-aligned on sortable columns.** Measured on a live sortable
      column: header content sits right, cell text lines up with it. This is D1, the defect the
      column factories existed for.
- [x] **Filter chips**, including a deep-linked `hidden` filter, which previously had no way to
      show itself. Removing one chip clears only that filter; Clear empties the URL.
- [x] **Text contrast 12.3–19.0:1** for header controls across light, editorial, dark and dark-blue.
- [x] **Status vocabulary** resolves and falls back — `PENDING_APPROVAL` → "Pending Approval"
      caution, an unknown status → neutral rather than nothing.

### Found and fixed

- [x] **The refresh indicator covered the Clear button.** Anchored top-right of the Card, whose
      first child is the header. Moved above the footer.
- [x] **Control borders failed WCAG 1.4.11.** 25% of the header foreground composites to 1.8:1 in
      light. A control there shares the header's background, so the border is the only thing
      defining it. Raised to 45%, which clears 3:1 in every theme; 40% would still fail light.
- [x] **`Reserve` was dead code.** Introduced in phase 2, never used.

### One false alarm worth recording

The harness initially reported the Clear button at 1.07:1 in dark — apparently invisible. It was an
artifact: the dev server's Tailwind output was missing the `text-(--outline-button-foreground)`
utility that the production build does emit, so the button fell back to an inherited colour.
Measuring against the shipped stylesheet showed Clear and the selects at identical contrast in all
four themes.

**The lesson is the same one the lint gate taught**: a measurement you have not seen produce both
answers is not a measurement. The first pass at the gate reported zero violations on a tree that
had nineteen; this reported a failure that did not exist. Both were caught by checking the
instrument, not the result.

### Still not verified

- [ ] The app's own screens, behind the sign-in wall. The harness proves the components; it does not
      prove every page wires them the way it thinks it does.
- [ ] Motion over time — that a filter change no longer *feels* like a page load. `keepPreviousData`
      and the held body height are correct in code and the indicator no longer displaces anything,
      but nobody has watched it.
