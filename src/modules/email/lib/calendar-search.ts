import type { CalendarEvent } from '@/modules/email/components/calendar/email-calendar-types';
import { searchWords as splitSearchWords } from '@/modules/tasks/lib/task-search';
import { addDays, startOfDay } from 'date-fns';

/**
 * Searching the calendar (elli-ui#1380). Events live in the provider, not in
 * Elli's database, so the search runs here over events already fetched: the
 * period on screen is filtered as the reader types, and a wider window — a
 * month back, three ahead — is fetched once to list matches outside it.
 */

/** The task search's words, folded the same way the event text is. */
export function searchWords(search: string): string[] {
  return splitSearchWords(fold(search));
}

type SearchableEvent = Pick<
  CalendarEvent,
  'title' | 'location' | 'organizer' | 'attendees' | 'projects' | 'description'
> &
  Partial<Pick<CalendarEvent, 'organizerEmail'>>;

/** Lower-cased with accents dropped, so "Café" is found by "cafe". */
function fold(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * The words of an Outlook description. It arrives as a whole HTML document,
 * and its `<style>` block and conditional comments are CSS, not prose —
 * matching them made "font" or "color" find every event.
 */
export function descriptionText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(style|script|head|title)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Everything a reader might remember an event by, folded, and kept apart by
 * how much a match there says: a word in the title is what the reader is
 * looking for, the same word in the body of a delivery note is not.
 */
type SearchFields = {
  title: string;
  /** Location and the projects of the threads it is linked to. */
  place: string;
  /** Organizer and attendees, by name and address. */
  people: string;
  description: string;
};

// Built once per event object, not once per keystroke: the views keep their
// mapped events stable between renders, and a description can be kilobytes.
const fieldsByEvent = new WeakMap<object, Map<string, SearchFields>>();

/**
 * The mailbox's own address is left out: it is on nearly every event, so
 * searching for your own name would otherwise match the whole calendar.
 */
function searchFields(event: SearchableEvent, ownAddress?: string | null): SearchFields {
  const own = ownAddress?.trim().toLowerCase() ?? '';
  let byOwner = fieldsByEvent.get(event);
  const cached = byOwner?.get(own);
  if (cached) return cached;

  const isOwn = (value?: string | null) => Boolean(own && value?.toLowerCase().includes(own));
  const join = (parts: Array<string | null | undefined>) =>
    fold(parts.filter(Boolean).join(' \n '));
  const fields: SearchFields = {
    title: fold(event.title),
    place: join([event.location, ...event.projects.map((project) => project.name)]),
    people: join([
      // By address where there is one: the organizer is often shown by name.
      isOwn(event.organizerEmail) || isOwn(event.organizer) ? null : event.organizer,
      ...event.attendees
        .filter((attendee) => !isOwn(attendee.email))
        .flatMap((attendee) => [attendee.name, attendee.email]),
    ]),
    description: event.description ? fold(descriptionText(event.description)) : '',
  };
  if (!byOwner) {
    byOwner = new Map();
    fieldsByEvent.set(event, byOwner);
  }
  byOwner.set(own, fields);
  return fields;
}

/** Whether `word` begins a word of `text` — "shop" in "Shop / …", not "Workshop". */
function startsWord(text: string, word: string): boolean {
  for (let at = text.indexOf(word); at !== -1; at = text.indexOf(word, at + 1)) {
    if (at === 0 || !/[\p{L}\p{N}]/u.test(text[at - 1])) return true;
  }
  return false;
}

/**
 * How well an event answers the search, lower is better; `null` when some word
 * is nowhere in it. Each word may be found in a different place, but the event
 * ranks by the least telling place any word needed.
 */
export function searchRelevance(
  event: SearchableEvent,
  words: readonly string[],
  ownAddress?: string | null
): number | null {
  if (words.length === 0) return 0;
  const fields = searchFields(event, ownAddress);
  const phrase = words.join(' ');
  if (fields.title.startsWith(phrase)) return 0;
  if (words.every((word) => startsWord(fields.title, word))) return 1;
  if (words.every((word) => fields.title.includes(word))) return 2;

  let worst = 2;
  for (const word of words) {
    if (fields.title.includes(word)) continue;
    if (fields.place.includes(word)) worst = Math.max(worst, 3);
    else if (fields.people.includes(word)) worst = Math.max(worst, 4);
    else if (fields.description.includes(word)) worst = Math.max(worst, 5);
    else return null;
  }
  return worst;
}

/** Every word somewhere in the event; no words matches everything. */
export function eventMatchesSearch(
  event: SearchableEvent,
  words: readonly string[],
  ownAddress?: string | null
): boolean {
  return searchRelevance(event, words, ownAddress) !== null;
}

/**
 * The wider window searched beyond the period on screen. Cut on whole days,
 * so it is one cache entry for the day however often the search changes.
 */
export function calendarSearchWindow(now: Date): { from: string; to: string } {
  const today = startOfDay(now);
  return {
    from: addDays(today, -30).toISOString(),
    to: addDays(today, 91).toISOString(),
  };
}

/**
 * Matches in the order they are wanted (elli-ui#1490): best match first — an
 * event titled by the search before one that only mentions it in its notes —
 * then, among equals, what is still to come, soonest first, before what is
 * past, latest first.
 *
 * A recurring meeting's occurrences are each an event; only the one nearest in
 * that order is listed, so a weekly meeting takes one row, not twenty.
 */
export function rankSearchResults<
  T extends SearchableEvent &
    Pick<CalendarEvent, 'start' | 'end'> &
    Partial<Pick<CalendarEvent, 'seriesMasterId'>>,
>(
  events: readonly T[],
  words: readonly string[],
  now: Date,
  ownAddress?: string | null,
  limit = 30
): T[] {
  if (words.length === 0) return [];
  const nowMs = now.getTime();
  const scored: Array<{ event: T; relevance: number; upcoming: boolean }> = [];
  for (const event of events) {
    const relevance = searchRelevance(event, words, ownAddress);
    if (relevance === null) continue;
    scored.push({ event, relevance, upcoming: event.end.getTime() >= nowMs });
  }
  scored.sort((a, b) => {
    if (a.relevance !== b.relevance) return a.relevance - b.relevance;
    if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
    const delta = a.event.start.getTime() - b.event.start.getTime();
    return a.upcoming ? delta : -delta;
  });

  const seenSeries = new Set<string>();
  const ranked: T[] = [];
  for (const { event } of scored) {
    if (event.seriesMasterId) {
      if (seenSeries.has(event.seriesMasterId)) continue;
      seenSeries.add(event.seriesMasterId);
    }
    ranked.push(event);
    if (ranked.length === limit) break;
  }
  return ranked;
}
