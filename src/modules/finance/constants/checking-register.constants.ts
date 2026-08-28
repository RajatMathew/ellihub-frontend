import type { QuickBooksRegisterClr } from '@/modules/integrations/schemas/quickbooks.schema';

export const REGISTER_DEFAULT_PAGE_SIZE = 25;

/** How far back the register looks when the user has picked no range. */
export const REGISTER_DEFAULT_RANGE_DAYS = 90;

export const REGISTER_CLR_VALUES: readonly QuickBooksRegisterClr[] = [
  'UNCLEARED',
  'CLEARED',
  'RECONCILED',
];

export const REGISTER_CLR_OPTIONS = [
  { label: 'Uncleared', value: 'UNCLEARED' },
  { label: 'Cleared', value: 'CLEARED' },
  { label: 'Reconciled', value: 'RECONCILED' },
];

/**
 * QuickBooks' cleared states in the shared status vocabulary.
 *
 * Reconciled is the settled end state, cleared is in flight, uncleared is
 * nothing-has-happened-yet — the same three tones every other list uses.
 */
export const REGISTER_CLR_TONES = {
  CLEARED: 'active',
  RECONCILED: 'positive',
  UNCLEARED: 'neutral',
} as const;

export const REGISTER_DATE_PRESETS = [
  {
    label: 'Last 30 days',
    getValue: () => {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: 'Last 90 days',
    getValue: () => {
      const to = new Date();
      const from = new Date(to);
      from.setDate(from.getDate() - (REGISTER_DEFAULT_RANGE_DAYS - 1));
      from.setHours(0, 0, 0, 0);
      return { from, to };
    },
  },
  {
    label: 'This month',
    getValue: () => {
      const to = new Date();
      return { from: new Date(to.getFullYear(), to.getMonth(), 1), to };
    },
  },
  {
    label: 'This year',
    getValue: () => {
      const to = new Date();
      return { from: new Date(to.getFullYear(), 0, 1), to };
    },
  },
] as const;
