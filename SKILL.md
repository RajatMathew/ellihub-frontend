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
- `src/app/components/field-info-tooltip.tsx`
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

- Main form container should use `unifiedFormPageClassName`, `unifiedFullHeightFormPageClassName`, or `unifiedProjectFormPageClassName` from `src/app/components/form-page-layout.ts`.
- Page background `bg-form-background`; do not use hardcoded `bg-gray-100` for form pages because it breaks dark mode.
- Top padding removed on the form container: `pt-0 lg:pt-0`.
- A sticky header block containing the form title/actions and the section nav.
- Sticky header block should use `unifiedFormHeaderClassName`.
- Toolbar spacing should use `unifiedFormToolbarClassName`; single-section forms should use `unifiedSingleSectionFormToolbarClassName`.
- Section nav wrapper should use `unifiedFormNavClassName`.
- Form content below the sticky header:
  - `space-y-6 pt-4 pb-8 lg:pb-10`

For project forms, prefer `ProjectFormShell` from `src/modules/project/components/shared/project-form-shell.tsx` instead of recreating the sticky toolbar/nav wrapper in every page.

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
- Mock/sample data actions should use `src/app/components/dev/mock-data-button.tsx` so the label, shuffle icon, and button style stay consistent.
- Form headers should use `src/app/components/form-page-toolbar.tsx` directly or through a thin domain toolbar wrapper.
- Submit actions should use `src/app/components/form-submit-button.tsx`; it shows a check icon normally and a spinning loader while `isSubmitting` is true.

## Browser Tab Titles

Set create/edit form tab titles in `src/app/routing/config/routes.tsx` with `formRouteTitles('Resource Name')`. Use titles like `Create RFQ` and `Edit Vendor`. Do not change project create/edit titles unless explicitly requested.

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

Measure sticky header height with `useStickyHeaderHeight` from `src/app/hooks/use-sticky-header-height.ts`, and pass that height as `scrollOffset`.

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

Use `FormFieldLabel` from `src/app/components/form-field-label.tsx` directly, or through an existing domain alias such as:

```tsx
<EmployeeFormFieldLabel required>Field Name</EmployeeFormFieldLabel>
```

The shared component owns the target label style: `text-xs font-semibold uppercase tracking-normal`.

Required field marker:

- Red `*`
- Immediately to the right of the label text.
- Only mark fields that the schema actually requires.
- Conditionally required fields should show `*` only when the condition makes them required and visible.

## Field Info Tooltips

Use `src/app/components/field-info-tooltip.tsx` only when the user explicitly asks for an
info tooltip beside a field label. Do not add a separate tooltip system.

```tsx
<VendorFormFieldLabel
  required
  info="Choose Inactive if the vendor is currently out of operation or unavailable for new work."
  infoLabel="Default status information"
>
  Default Status
</VendorFormFieldLabel>
```

## Numeric Inputs

Use `src/app/components/ui/number-input.tsx` only when the user explicitly asks for improved numeric input behavior. Prefer `NumberInput` over native `type="number"` for sane clearing, decimal-place control, max/min clamping, and avoiding scroll-wheel value changes. Omit `decimalPlaces` or set it to `0` for integer-only fields; use `decimalPlaces={2}` only when decimals are valid.

```tsx
<NumberInput value={field.value} onValueChange={field.onChange} min={0} max={100} decimalPlaces={2} />
```

## Validation Styling

Error text alone is not enough. Invalid controls need a red border/ring.

Use `formInvalidControlClassName` from `src/app/components/form-field-label.tsx`.

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
7. Add info tooltips only if the user explicitly asks for them.
8. Add invalid red border/ring to every visible control type in that form.
9. Ensure click nav scrolls to the correct section and scroll updates the active step.
10. Add bottom padding after the final section.
11. Format touched files with `bunx prettier --write`.

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
- Field info tooltips use sentence case, a visible `i` icon, a dark bubble, and a bottom arrow.
- Invalid inputs and dropdowns show red border/ring.
- Final card has bottom breathing room.
