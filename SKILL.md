---
name: elli-form-unification
description: Use when updating Elli UI create/edit form pages to the unified form layout, sticky header, green stepper section nav, PO-style typography, required-field markers, and validation styling established on /app/hr/employees/create.
---

# Elli Form Unification

Use this skill when applying the finalized `/app/hr/employees/create` form pattern to other create/edit form pages in `elli-ui`.

## First Reference

Treat these files as the source of truth before changing another form:

- `src/modules/hr/pages/employees/employee-form.tsx`
- `src/modules/hr/components/employees/form/employee-form-content.tsx`
- `src/modules/hr/components/employees/form/employee-form-toolbar.tsx`
- `src/modules/hr/components/employees/form/employee-form-field.tsx`
- `src/modules/hr/components/employees/form/employee-basic-info-section.tsx`
- `src/modules/hr/components/employees/form/employee-employment-section.tsx`
- `src/modules/hr/components/employees/form/employee-emergency-section.tsx`
- `src/app/components/form-section-nav.tsx`
- `src/app/components/form-page-layout.ts`

Do not change project create/edit forms unless explicitly requested. They are the behavioral reference for sticky header/nav and click-scroll behavior.

## Commands

- Use `bun` for package scripts and formatting.
- Do not run build or lint unless the user asks.
- If formatting changed files, prefer targeted formatting:
  `bunx prettier --write <files>`

## Target Layout

Each unified form page should use:

- Main form container based on `formPageContainerClassName`.
- Page background `bg-gray-100`.
- Top padding removed on the form container: `pt-0 lg:pt-0`.
- A sticky header block containing the form title/actions and the section nav.
- Sticky header block:
  - `sticky top-0 z-20`
  - white/background layer: `bg-background/95 backdrop-blur-md`
  - bottom separator only: `border-b border-border`
  - no top border, to avoid double-border flashes with app breadcrumbs.
- Form content below the sticky header:
  - `space-y-6 pt-4 pb-8 lg:pb-10`

Use constants for long class strings when the page owns the full form shell. This makes later rollout cleaner.

## Header / Toolbar

For the unified compact form header:

- Remove breadcrumb/eyebrow text inside the form body.
- Remove helper subtitle under the page title unless the target form already has a meaningful design reason.
- Keep one title row with actions on the right.
- Use existing `Toolbar`, but set `sticky={false}` because the wrapper owns sticky behavior.
- Override toolbar spacing like the employee form:
  - no negative margin: `mt-0`
  - compact top spacing: `pt-4`
  - compact bottom spacing: `pb-2`
  - transparent background inside sticky wrapper.

## Section Nav

Use `FormSectionNav` with:

```tsx
<FormSectionNav
  sections={FORM_SECTIONS}
  activeSection={activeSection}
  onSectionChange={setActiveSection}
  scrollOffset={headerHeight}
  density="compact"
  appearance="stepper"
  className={formNavClassName}
/>
```

Rules:

- Each section card must have an `id` matching the nav section id.
- `appearance="stepper"` is the green stepper style.
- Only the active step is green. Previous and future steps are gray.
- The nav should be `static` when it is inside the outer sticky wrapper.
- Do not add a top border to the nav.
- The shared `FormSectionNav` scroll detection is scroll-position based; preserve it unless a bug is observed.

Measure sticky header height with a `ResizeObserver` as in `employee-form.tsx`, and pass that height as `scrollOffset`.

## Section Cards

Follow the PO create form typography:

- Section title: `text-lg font-semibold text-foreground`
- Section description: `text-sm text-muted-foreground`
- Card content: `space-y-6`
- Divider after title/description: `Separator`
- Field grids generally use `grid grid-cols-1 gap-5 md:grid-cols-2` or `md:grid-cols-3`, matching the content.

Avoid the older heavy style:

- Do not use `tracking-widest` for form section headings or field labels.
- Do not use all-caps section headings.
- Do not use `font-bold` on form labels unless the target design explicitly requires it.

## Field Labels And Required Marks

Use the employee helper pattern for labels on converted forms.

For employee form this is:

```tsx
<EmployeeFormFieldLabel required>Field Name</EmployeeFormFieldLabel>
```

When applying to another domain, create or reuse a local form field helper if needed. The target label style is:

```tsx
text-xs font-semibold uppercase tracking-normal
```

Required field marker:

- Red `*`
- Immediately to the right of the label text.
- Only mark fields that the schema actually requires.
- Conditionally required fields should show `*` only when the condition makes them required and visible.

## Validation Styling

Error text alone is not enough. Invalid controls need a red border/ring.

Use the same class pattern:

```tsx
border-destructive/60 ring-[3px] ring-destructive/10 dark:border-destructive dark:ring-destructive/20
```

Apply it to the actual visible control:

- `InputWrapper` for inputs with icons.
- `Input` for plain inputs without wrapper.
- `SearchableSelect` via `className`.
- `SelectTrigger` via `className` and `aria-invalid`.
- Textareas should receive equivalent invalid styling if the component does not already handle `aria-invalid`.

Validation schema and UI must agree. If a field is marked required in UI, enforce it in the schema with a clear message.

## Active Section State

The page hook or form state should expose:

- `activeSection`
- `setActiveSection`

Initialize active section to the first section id.

Do not make the nav manage active section internally; keep state at page/hook level so click and scroll stay synchronized.

## Migration Steps

1. Inspect the target form page, toolbar, content sections, schema, and loading state.
2. Identify section ids and labels.
3. Move the nav into the sticky header wrapper.
4. Compact the toolbar and remove old in-form breadcrumbs/subtitles.
5. Update section typography to PO-style.
6. Add required `*` markers only where schema requires.
7. Add invalid red border/ring to every visible control type in that form.
8. Ensure click nav scrolls to the correct section and scroll updates the active step.
9. Add bottom padding after the final section.
10. Format touched files with `bunx prettier --write`.

## Verification

When the user asks to verify:

- Use `bun run build`.
- Use `bun run lint`.
- Expect possible existing warnings unrelated to the form work:
  - Vite Node version warning if Node is below Vite’s recommended version.
  - Large chunk warnings.
  - Existing lint warnings around TanStack `useReactTable`.

For visual verification, check:

- No extra blank space above sticky form header.
- Exactly one separator between breadcrumbs/header and form header during hard scroll.
- Stepper active state changes one section at a time.
- Required markers match schema.
- Invalid inputs and dropdowns show red border/ring.
- Final card has bottom breathing room.
