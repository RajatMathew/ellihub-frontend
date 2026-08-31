/**
 * Trigger sizes shared by `InfiniteSearchSelect` and `InfiniteMultiSearchSelect`.
 *
 * Kept in step with `selectTriggerVariants` in `select.tsx` so a picker can sit
 * in a row of selects without the caller restating a height. `toolbar` is the
 * 36px table card header row — see docs/table-consistency-plan.md, phase 1.
 *
 * Its own module because both pickers are components, and a component file that
 * also exports a constant breaks fast refresh.
 */
export const searchSelectTriggerSizes = {
  md: 'h-8.5 px-3 gap-1 text-[0.8125rem] leading-(--text-sm--line-height)',
  toolbar: 'h-9 px-3 gap-2 text-2sm',
} as const;

export type SearchSelectSize = keyof typeof searchSelectTriggerSizes;
