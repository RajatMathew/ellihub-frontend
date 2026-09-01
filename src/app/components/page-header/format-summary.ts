import type { SummaryDef } from './page-header.types';

/**
 * The wording every list page uses to describe its result set.
 *
 * One function so "Showing 6 results" cannot become "6 results shown" on the
 * next page a developer touches.
 *
 * The phrasing follows the HR list pages, which were the only ones ever to
 * render a summary — `ResourcePageHeader` gated its own behind a flag no caller
 * passed, so its wording had never reached a screen.
 */
export function formatSummary({ total, filtered, label }: SummaryDef): string {
  if (filtered) return `Showing ${total} result${total === 1 ? '' : 's'}`;
  return label ? `Total ${label}: ${total}` : `Total: ${total}`;
}
