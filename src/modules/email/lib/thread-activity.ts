import type { CalendarEventEmailLink, EmailActivity } from '@/modules/email/api';
import { format, isSameDay, isSameYear, subDays } from 'date-fns';

/**
 * Where each recorded action shows in a thread's timeline (elli-ui#1309).
 *
 * An action is drawn above the email it was done from. Notes, and anything
 * whose email is not one of the messages on screen — the thread as a whole,
 * or a message no longer in it — go at the top of the thread instead, so
 * nothing recorded is ever silently left out.
 */
export function groupThreadActivity(
  items: readonly EmailActivity[],
  messageIds: readonly string[]
): { threadLevel: EmailActivity[]; byMessage: Map<string, EmailActivity[]> } {
  const onScreen = new Set(messageIds);
  const threadLevel: EmailActivity[] = [];
  const byMessage = new Map<string, EmailActivity[]>();
  for (const item of items) {
    if (item.kind === 'note' || !item.providerId || !onScreen.has(item.providerId)) {
      threadLevel.push(item);
      continue;
    }
    const list = byMessage.get(item.providerId) ?? [];
    list.push(item);
    byMessage.set(item.providerId, list);
  }
  for (const [key, list] of byMessage) byMessage.set(key, clubTriageActivity(list));
  return { threadLevel: clubTriageActivity(threadLevel), byMessage };
}

/** The id an activity names a message by: its provider id, else the cache id. */
export function threadMessageKey(message: { id: string; providerId?: string }): string {
  return message.providerId ?? message.id;
}

/**
 * The feed's day headings: "Today", "Yesterday", then the date — in the
 * reader's own time, since these are moments, not calendar dates.
 */
export function groupActivityByDay(
  items: readonly EmailActivity[],
  now: Date = new Date()
): Array<{ label: string; items: EmailActivity[] }> {
  const groups: Array<{ label: string; items: EmailActivity[] }> = [];
  for (const item of items) {
    const label = dayLabel(new Date(item.createdAt), now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, subDays(now, 1))) return 'Yesterday';
  return format(date, isSameYear(date, now) ? 'EEEE, MMMM d' : 'EEEE, MMMM d, yyyy');
}

/** How far apart two triage changes can be and still read as one. */
export const CLUB_WINDOW_MS = 3 * 60 * 1000;

type TriageDetails = {
  status?: string;
  assignee?: string | null;
  references?: Array<{ type: string; label: string }>;
  changed?: string[];
  /** Set on a clubbed links row: what the run linked and unlinked, net of each other. */
  linked?: string[];
  unlinked?: string[];
};

const COURT_LABELS: Record<string, string> = {
  open: 'Open',
  open_our_court: 'Open, our court',
  open_their_court: 'Open, their court',
  closed: 'Closed',
};

/**
 * Which kind of triage change a row is, for clubbing: the court and the
 * assignee club together, linked items club together. A save that changed
 * both kinds at once, and anything that is not triage — notes, tasks,
 * calendar events, replies — never clubs.
 */
function clubKind(item: EmailActivity): 'court-assignee' | 'links' | null {
  if (item.kind !== 'triage') return null;
  const changed = (item.details as TriageDetails | null)?.changed ?? [];
  if (changed.length === 0) return null;
  if (changed.every((field) => field === 'status' || field === 'assignee')) {
    return 'court-assignee';
  }
  if (changed.every((field) => field === 'references')) return 'links';
  return null;
}

/** Same person, same way (by hand, or Elliot approved by the same person), same place. */
function clubKey(item: EmailActivity): string {
  return [
    item.accountId,
    item.conversationKey,
    item.providerId ?? '',
    item.actor.type,
    item.actor.userId,
    item.approvedBy?.id ?? '',
  ].join('\u0000');
}

/**
 * Triage changes made one after another — set the assignee, then the court —
 * read as one line instead of several (elli-ui#1309). Rows club only with
 * their own kind, from the same person, and only while each is within
 * `CLUB_WINDOW_MS` of the next; anything else in between keeps them apart.
 * `items` are newest first, as the timeline and the feed draw them.
 */
export function clubTriageActivity(
  items: readonly EmailActivity[],
  windowMs: number = CLUB_WINDOW_MS
): EmailActivity[] {
  const result: EmailActivity[] = [];
  let group: EmailActivity[] = [];

  const flush = () => {
    if (group.length === 1) result.push(group[0]!);
    else if (group.length > 1) result.push(mergeGroup(group));
    group = [];
  };

  for (const item of items) {
    const kind = clubKind(item);
    const last = group.at(-1);
    const joins =
      last !== undefined &&
      kind !== null &&
      clubKind(last) === kind &&
      clubKey(last) === clubKey(item) &&
      new Date(last.createdAt).getTime() - new Date(item.createdAt).getTime() <= windowMs;
    if (!joins) flush();
    if (kind === null) result.push(item);
    else group.push(item);
  }
  flush();
  return result;
}

/** One line for a run of clubbed rows; `group` is newest first. */
function mergeGroup(group: EmailActivity[]): EmailActivity {
  const newest = group[0]!;
  const chronological = [...group].reverse();
  const details = newest.details as TriageDetails | null;
  const links = clubKind(newest) === 'links' ? netLinks(chronological) : null;
  const summary = links ? linksSummary(links) : courtAssigneeSummary(chronological);
  return {
    ...newest,
    id: group.map((item) => item.id).join('+'),
    summary,
    details: {
      ...details,
      ...(links && { linked: links.linked, unlinked: links.unlinked }),
      changed: [
        ...new Set(group.flatMap((item) => (item.details as TriageDetails)?.changed ?? [])),
      ],
    },
  };
}

function courtAssigneeSummary(chronological: EmailActivity[]): string {
  let assignee: string | null | undefined;
  let status: string | undefined;
  for (const item of chronological) {
    const details = item.details as TriageDetails | null;
    const changed = details?.changed ?? [];
    if (changed.includes('assignee')) assignee = details?.assignee ?? null;
    if (changed.includes('status')) status = details?.status;
  }
  const parts: string[] = [];
  if (assignee !== undefined) {
    parts.push(assignee ? `assigned this thread to ${assignee}` : 'unassigned this thread');
  }
  if (status !== undefined) {
    parts.push(
      status === 'unset'
        ? 'cleared the court'
        : `set the court to ${COURT_LABELS[status] ?? status}`
    );
  }
  return parts.join(' and ') || chronological.at(-1)!.summary;
}

/**
 * What ended up linked and unlinked over the run, read off each row's own
 * sentence ("linked A, B" / "unlinked C"). Linking then unlinking the same
 * record in the run cancels out. Null when a row's sentence is not one of those.
 */
function netLinks(chronological: EmailActivity[]): { linked: string[]; unlinked: string[] } | null {
  const linked = new Set<string>();
  const unlinked = new Set<string>();
  for (const item of chronological) {
    const match = LINK_SENTENCE.exec(item.summary);
    if (!match) return null;
    for (const label of match[2]!.split(', ')) {
      if (match[1] === 'linked') {
        if (unlinked.has(label)) unlinked.delete(label);
        else linked.add(label);
      } else if (linked.has(label)) {
        linked.delete(label);
      } else {
        unlinked.add(label);
      }
    }
  }
  return { linked: [...linked], unlinked: [...unlinked] };
}

const LINK_SENTENCE = /^(linked|unlinked) (.+)$/;

function linksSummary(links: { linked: string[]; unlinked: string[] } | null): string {
  if (!links) return 'changed the linked items';
  const parts: string[] = [];
  if (links.linked.length) parts.push(`linked ${links.linked.join(', ')}`);
  if (links.unlinked.length) parts.push(`unlinked ${links.unlinked.join(', ')}`);
  return parts.join(' and ') || 'changed the linked items';
}

/**
 * The records a links row linked and unlinked: carried on a clubbed row, read
 * off the sentence of a single one. Null for any other row.
 */
function linkChanges(item: EmailActivity): { linked: string[]; unlinked: string[] } | null {
  if (item.kind !== 'triage') return null;
  const details = item.details as TriageDetails | null;
  if (details?.linked || details?.unlinked) {
    return { linked: details.linked ?? [], unlinked: details.unlinked ?? [] };
  }
  const match = LINK_SENTENCE.exec(item.summary);
  if (!match) return null;
  const labels = match[2]!.split(', ');
  return match[1] === 'linked'
    ? { linked: labels, unlinked: [] }
    : { linked: [], unlinked: labels };
}

const countItems = (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`;

/**
 * The sentence a row reads as. A row that links or unlinks several records
 * counts them — "unlinked 5 items" — and leaves the names to its chips, so a
 * long list does not wrap the line; one record is still named in full. A row
 * whose event or task is drawn beneath it leaves the title to that card.
 */
export function activitySummary(item: EmailActivity, hasEvent = false): string {
  // The event or task is drawn under the line, title and all.
  if (hasEvent) return 'added a calendar event';
  if (item.task) return 'added a task';
  const links = linkChanges(item);
  if (!links || links.linked.length + links.unlinked.length <= 1) return item.summary;
  const parts: string[] = [];
  if (links.linked.length) parts.push(`linked ${countItems(links.linked.length)}`);
  if (links.unlinked.length) parts.push(`unlinked ${countItems(links.unlinked.length)}`);
  return parts.join(' and ');
}

/**
 * The chips a triage row shows: only what that row changed. A row's details
 * carry the whole classification after the save, so drawing all of it made
 * "set the court to Open" also show the assignee and every linked record. A
 * links row shows the records it linked, and — as labels only, since they are
 * gone from the classification — the ones it unlinked. Rows recorded before
 * `changed` existed still show everything — there is nothing to narrow them by.
 */
export function triageChips(item: EmailActivity): {
  status: string | null;
  assignee: string | null;
  references: Array<{ type: string; label: string }>;
  unlinked: string[];
} {
  const details = item.details as TriageDetails | null;
  if (!details) return { status: null, assignee: null, references: [], unlinked: [] };
  const changed = details.changed;
  const shows = (field: string) => !changed || changed.includes(field);
  const status = shows('status') && details.status !== 'unset' ? (details.status ?? null) : null;
  const assignee = shows('assignee') ? (details.assignee ?? null) : null;
  if (!changed) {
    return { status, assignee, references: details.references ?? [], unlinked: [] };
  }
  if (!changed.includes('references')) return { status, assignee, references: [], unlinked: [] };
  const links = linkChanges(item);
  const linked = new Set(links?.linked ?? []);
  return {
    status,
    assignee,
    references: (details.references ?? []).filter((reference) => linked.has(reference.label)),
    unlinked: links?.unlinked ?? [],
  };
}

/** An "added calendar event" row's event, as its line draws it. */
export type ActivityCalendarEvent = Pick<
  CalendarEventEmailLink,
  'eventSubject' | 'eventStart' | 'eventEnd' | 'eventIsAllDay'
> & { deleted: boolean };

type CalendarEventDetails = {
  eventStart?: string | null;
  eventEnd?: string | null;
  eventIsAllDay?: boolean;
  deletedAt?: string;
};

/**
 * The event an "added calendar event" row made, so the row can show it the way
 * the details panel does — its date, not just its title. The live link wins,
 * so an edit shows; once the link is gone the row's own copy of the event
 * stands in, marked deleted when the event was. Null for any other row, and
 * for a row recorded before it kept a copy — that row keeps its sentence.
 */
export function activityCalendarEvent(
  item: EmailActivity,
  links: readonly CalendarEventEmailLink[] | undefined
): ActivityCalendarEvent | null {
  if (item.action !== 'calendar_event' || !item.entityId) return null;
  const link = links?.find((candidate) => candidate.eventId === item.entityId);
  if (link) {
    const { eventSubject, eventStart, eventEnd, eventIsAllDay } = link;
    return { eventSubject, eventStart, eventEnd, eventIsAllDay, deleted: false };
  }
  const details = item.details as CalendarEventDetails | null;
  if (!details || details.eventIsAllDay === undefined) return null;
  return {
    eventSubject: item.entityLabel,
    eventStart: details.eventStart ?? null,
    eventEnd: details.eventEnd ?? null,
    eventIsAllDay: details.eventIsAllDay,
    deleted: Boolean(details.deletedAt),
  };
}
