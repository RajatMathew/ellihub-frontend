# Table Card Header Pattern

Use this pattern for table cards that need category tabs, search, filters, a stable loading state, and theme-safe styling.

## Source Components

Import the shared header controls from `src/app/components/table-card-header.tsx`:

```tsx
import {
  TableCardHeader,
  TableCardHeaderClearButton,
  TableCardHeaderSearch,
  TableCardHeaderSelect,
  TableCardHeaderTabs,
  TableCardHeaderToolbar,
} from '@/app/components/table-card-header'
```

Use the existing table body wrapper from `src/app/components/data-grid-section.tsx`.

```tsx
import { DataGridSection } from '@/app/components/data-grid-section'
```

Do not manually edit generated primitives in `src/app/components/ui/*` to support a table variant. Keep table-specific composition in the shared table header components.

## Basic Structure

```tsx
<Card className="overflow-hidden">
  <TableCardHeader
    title={
      <TableCardHeaderTabs
        activeValue={typeFilter}
        tabs={[
          { label: 'All', value: undefined },
          { label: 'Fabrication', value: 'FABRICATION' },
          { label: 'Installation', value: 'INSTALLATION' },
          { label: 'Material', value: 'MATERIAL' },
        ]}
        onChange={setTypeFilter}
      />
    }
    actions={
      <TableCardHeaderToolbar>
        <TableCardHeaderSearch
          value={search}
          placeholder="Search vendors..."
          onChange={setSearch}
        />

        <TableCardHeaderSelect
          value={status}
          placeholder="All Statuses"
          icon={ListFilterPlus}
          options={[
            { label: 'All Statuses', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          onValueChange={setStatus}
        />

        <TableCardHeaderClearButton
          active={hasActiveFilters}
          onClick={clearFilters}
        />
      </TableCardHeaderToolbar>
    }
  />

  <DataGridSection
    table={table}
    totalCount={totalCount}
    emptyTitle="No vendors found"
    isLoading={showTableSkeleton}
    refreshIndicator="none"
  />
</Card>
```

## Design Rules

The tab underline must touch the bottom edge of the header. Do this through `TableCardHeaderTabs`; do not add margins or wrappers that lift the underline away from the header base.

Tabs must stay vertically centered regardless of header height. The tab button padding should occupy the full header height so hover, active, and cursor states feel like one continuous control.

Use DM Mono styling through the shared component. Avoid recreating typography classes in feature table files.

The header controls must share the same visual system:

- Same height.
- Same icon size.
- Same text size and weight.
- Same foreground color.
- Same border treatment.
- Same focus treatment.
- Same left-aligned select value.

Use `ListFilterPlus` for table filter selects unless the filter has a more specific icon.

The clear button should reserve layout space when inactive. Use the `active` prop instead of conditionally mounting the button; this prevents width shifts when filters change.

Interactive header elements should show `cursor-pointer` on hover.

## Theme Tokens

Do not hardcode the tab accent in JSX.

Use:

```css
--table-card-tab-accent
```

It is registered in Tailwind through:

```css
--color-table-card-tab-accent: var(--table-card-tab-accent);
```

Current theme behavior:

- Editorial theme uses the custom editorial gold.
- Other themes map the accent to their appropriate primary color.

When adding or changing this token, define it in every theme file:

- `src/app/styles/themes/light.css`
- `src/app/styles/themes/editorial.css`
- `src/app/styles/themes/dark.css`
- `src/app/styles/themes/dark-blue.css`

Table header foreground and control colors should use semantic table/card tokens, not hardcoded white, black, blue, or hex values in components.

## Loading Behavior

For filter and search changes, avoid replacing the whole table with a blank state.

Use React Query `keepPreviousData`:

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query'

useQuery({
  queryKey: ['vendors', filters],
  queryFn: fetchVendors,
  placeholderData: keepPreviousData,
})
```

Show table skeleton rows during refetch:

```ts
const showTableSkeleton = initialLoading || (hasRows && query.isFetching)
```

Pass that to `DataGridSection`:

```tsx
<DataGridSection
  isLoading={showTableSkeleton}
  refreshIndicator="none"
  {...tableProps}
/>
```

This keeps the card height stable and removes the visible jerk during search/filter updates.

## Migration Checklist

1. Wrap the table in `Card`.
2. Replace custom card header markup with `TableCardHeader`.
3. Use `TableCardHeaderTabs` for category tabs.
4. Use `TableCardHeaderToolbar` for right-side controls.
5. Use `TableCardHeaderSearch` for search.
6. Use `TableCardHeaderSelect` for dropdown filters.
7. Use `TableCardHeaderClearButton` with `active={hasActiveFilters}`.
8. Add `keepPreviousData` to the table query.
9. Pass refetch loading into table skeleton rows.
10. Set `refreshIndicator="none"` when the skeleton represents refetching.
11. Use semantic theme tokens only.
12. Check both light and dark themes.
13. Run `git diff --check`.
14. Run targeted lint for the touched files.

## What Not To Do

Do not manually restyle each table header in feature modules.

Do not hardcode the editorial yellow in components.

Do not conditionally mount the clear button if that changes toolbar width.

Do not use an inline refresh strip and skeleton rows at the same time for the same refetch.

Do not edit generated `src/app/components/ui/*` primitives for one table use case.
