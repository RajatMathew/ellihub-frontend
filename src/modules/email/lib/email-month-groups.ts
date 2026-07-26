import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { format, isSameMonth, isValid, parseISO, startOfMonth, subMonths } from 'date-fns';

export type EmailMonthGroup = {
  key: string;
  label: string;
  emails: EmailListItem[];
};

type MutableEmailMonthGroup = EmailMonthGroup & {
  sortValue: number;
};

const UNKNOWN_MONTH_KEY = 'unknown-date';

export function groupEmailsByMonth(
  emails: EmailListItem[],
  now: Date = new Date()
): EmailMonthGroup[] {
  const currentMonth = startOfMonth(now);
  const previousMonth = subMonths(currentMonth, 1);
  const groups = new Map<string, MutableEmailMonthGroup>();

  for (const email of emails) {
    const receivedAt = parseISO(email.receivedAt);
    const hasValidDate = isValid(receivedAt);
    const month = hasValidDate ? startOfMonth(receivedAt) : null;
    const key = month ? format(month, 'yyyy-MM') : UNKNOWN_MONTH_KEY;
    const existingGroup = groups.get(key);

    if (existingGroup) {
      existingGroup.emails.push(email);
      continue;
    }

    groups.set(key, {
      key,
      label: getMonthLabel(month, currentMonth, previousMonth),
      emails: [email],
      sortValue: month?.getTime() ?? Number.NEGATIVE_INFINITY,
    });
  }

  return Array.from(groups.values())
    .sort((first, second) => second.sortValue - first.sortValue)
    .map(({ sortValue: _sortValue, ...group }) => group);
}

function getMonthLabel(month: Date | null, currentMonth: Date, previousMonth: Date): string {
  if (!month) return 'Unknown date';
  if (isSameMonth(month, currentMonth)) return 'This month';
  if (isSameMonth(month, previousMonth)) return 'Last month';
  return format(month, 'MMMM yyyy');
}
