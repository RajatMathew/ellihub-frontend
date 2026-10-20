/**
 * Elliot's chat history list: what each row says and how the rows group.
 *
 * Pure, so it can be tested without a renderer; the clock is passed in.
 */

export type AgentHistoryItem = {
  id: string;
  title: string;
  summary: string | null;
  updatedAt: string;
};

export type AgentHistoryGroup<T extends AgentHistoryItem> = {
  label: string;
  items: T[];
};

/**
 * A stored summary is the start of Elliot's last reply, markdown and all — the
 * list printed "**October 10, 2026**" and "> Thanks for…". This reduces it to
 * the plain sentence a reader would see.
 */
export function plainSummary(markdown: string | null | undefined): string {
  if (!markdown) return '';
  return (
    markdown
      // Fenced code is noise in a one-line preview.
      .replace(/```[\s\S]*?(```|$)/g, ' ')
      // Links and images keep their text.
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Line-start markers: headings, quotes, list bullets and numbers.
      .replace(/^\s{0,3}(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/gm, '')
      // A quote marker inside a summary the server already joined onto one
      // line ("reply: > Thanks"), after a sentence or a colon — not "5 > 3".
      .replace(/([:.!?])\s+>\s+/g, '$1 ')
      // Table pipes and divider rows.
      .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
      .replace(/\|/g, ' ')
      // Emphasis and inline code markers. Underscores count only at word
      // boundaries, as in markdown itself, so file_name_v2.pdf survives.
      .replace(/(\*\*|\*|`|~~)(?=\S)([\s\S]*?\S)\1/g, '$2')
      .replace(/(^|[^\w])(__|_)(?=\S)([\s\S]*?\S)\2(?!\w)/g, '$1$3')
      .replace(/[*`]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight of the viewer's day containing `date`. */
const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** Whole local days between `then` and `now` — 0 today, 1 yesterday. */
function localDaysAgo(then: Date, now: Date): number {
  return Math.round((startOfLocalDay(now) - startOfLocalDay(then)) / DAY_MS);
}

/** Newest first, grouped the way chat apps do: Today, Yesterday, Previous 7 days, Older. */
export function groupHistory<T extends AgentHistoryItem>(
  items: T[],
  now: Date
): AgentHistoryGroup<T>[] {
  const order = ['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const;
  const buckets = new Map<string, T[]>(order.map((label) => [label, []]));
  const sorted = [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  for (const item of sorted) {
    const days = localDaysAgo(new Date(item.updatedAt), now);
    const label =
      days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? 'Previous 7 days' : 'Older';
    buckets.get(label)!.push(item);
  }
  return order
    .map((label) => ({ label, items: buckets.get(label)! }))
    .filter((group) => group.items.length > 0);
}

const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const monthDayYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

/** "Just now", "12m", "3h", "Yesterday", "Tue", "Oct 3", "Oct 3, 2025". */
export function historyTimeLabel(updatedAt: string, now: Date): string {
  const then = new Date(updatedAt);
  if (Number.isNaN(then.getTime())) return '';
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60_000);
  const days = localDaysAgo(then, now);
  if (days <= 0) {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h`;
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return weekday.format(then);
  return then.getFullYear() === now.getFullYear()
    ? monthDay.format(then)
    : monthDayYear.format(then);
}

/** Search across the title and the plain summary, ignoring case and markdown. */
export function matchesHistorySearch(item: AgentHistoryItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${item.title} ${plainSummary(item.summary)}`.toLowerCase().includes(needle);
}
