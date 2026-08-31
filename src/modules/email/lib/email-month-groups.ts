import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';

export type EmailMonthGroup = {
  key: string;
  label: string;
  emails: EmailListItem[];
};

type MutableEmailMonthGroup = EmailMonthGroup & {
  priority: number;
  sortValue: number;
};

const UNKNOWN_MONTH_KEY = 'unknown-date';
const RELATIVE_GROUP_PRIORITIES = {
  today: 5,
  thisWeek: 4,
  lastWeek: 3,
  thisMonth: 2,
  lastMonth: 1,
  olderMonth: 0,
  unknown: -1,
} as const;

export function groupEmailsByMonth(
  emails: EmailListItem[],
  now: Date = new Date()
): EmailMonthGroup[] {
  const currentDay = startOfDay(now);
  const currentWeek = startOfWeek(now, { weekStartsOn: 1 });
  const previousWeek = subWeeks(currentWeek, 1);
  const currentMonth = startOfMonth(now);
  const previousMonth = subMonths(currentMonth, 1);
  const groups = new Map<string, MutableEmailMonthGroup>();

  for (const email of emails) {
    const receivedAt = parseISO(email.receivedAt);
    const descriptor = getDateGroupDescriptor(
      isValid(receivedAt) ? receivedAt : null,
      currentDay,
      currentWeek,
      previousWeek,
      currentMonth,
      previousMonth
    );
    const existingGroup = groups.get(descriptor.key);

    if (existingGroup) {
      existingGroup.emails.push(email);
      continue;
    }

    groups.set(descriptor.key, {
      key: descriptor.key,
      label: descriptor.label,
      emails: [email],
      priority: descriptor.priority,
      sortValue: descriptor.sortValue,
    });
  }

  return Array.from(groups.values())
    .sort((first, second) => second.priority - first.priority || second.sortValue - first.sortValue)
    .map(({ priority: _priority, sortValue: _sortValue, ...group }) => group);
}

function getDateGroupDescriptor(
  receivedAt: Date | null,
  currentDay: Date,
  currentWeek: Date,
  previousWeek: Date,
  currentMonth: Date,
  previousMonth: Date
) {
  if (!receivedAt) {
    return {
      key: UNKNOWN_MONTH_KEY,
      label: 'Unknown date',
      priority: RELATIVE_GROUP_PRIORITIES.unknown,
      sortValue: Number.NEGATIVE_INFINITY,
    };
  }

  if (isSameDay(receivedAt, currentDay)) {
    return {
      key: 'today',
      label: 'Today',
      priority: RELATIVE_GROUP_PRIORITIES.today,
      sortValue: currentDay.getTime(),
    };
  }

  if (receivedAt >= currentWeek && receivedAt < currentDay) {
    return {
      key: 'this-week',
      label: 'This week',
      priority: RELATIVE_GROUP_PRIORITIES.thisWeek,
      sortValue: currentWeek.getTime(),
    };
  }

  if (receivedAt >= previousWeek && receivedAt < currentWeek) {
    return {
      key: 'last-week',
      label: 'Last week',
      priority: RELATIVE_GROUP_PRIORITIES.lastWeek,
      sortValue: previousWeek.getTime(),
    };
  }

  const month = startOfMonth(receivedAt);
  if (isSameMonth(month, currentMonth)) {
    return {
      key: 'this-month',
      label: 'This month',
      priority: RELATIVE_GROUP_PRIORITIES.thisMonth,
      sortValue: currentMonth.getTime(),
    };
  }

  if (isSameMonth(month, previousMonth)) {
    return {
      key: 'last-month',
      label: 'Last month',
      priority: RELATIVE_GROUP_PRIORITIES.lastMonth,
      sortValue: previousMonth.getTime(),
    };
  }

  return {
    key: format(month, 'yyyy-MM'),
    label: format(month, 'MMMM yyyy'),
    priority: RELATIVE_GROUP_PRIORITIES.olderMonth,
    sortValue: month.getTime(),
  };
}
