import { addDays, addHours, format, isSameYear, isValid, startOfDay } from 'date-fns';

/**
 * Dates written in an email — "tomorrow, at 10", "next Tuesday", "Oct 14 at
 * 3pm" — found so the reader can turn one into a calendar event with a click
 * (elli-ui#686), the way Zoho Mail underlines them.
 *
 * Relative words are read against the message's own date, not today: a
 * "tomorrow" in last week's email is last week's tomorrow, and the event
 * dialog says so when that is already past.
 *
 * Deliberately narrow. A false underline on ordinary prose is worse than a
 * missed date, so only forms that are unambiguously a day are matched: no
 * numeric dates (10/11 is October or November depending on the sender), no
 * weekday abbreviations ("sat", "wed" and "sun" are words), and a bare number
 * is only a time when it follows "at" or carries am/pm.
 */

export type DateMention = {
  /** Where the phrase starts in the text it was found in. */
  index: number;
  /** The phrase as written, time included. */
  text: string;
  /** The day, at the time given — or at the start of the day when none was. */
  start: Date;
  /** Whether the phrase named a time; without one the event is all day. */
  hasTime: boolean;
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const MONTH = `(${Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|')})\\.?`;
const ORDINAL = '(\\d{1,2})(?:st|nd|rd|th)?';
const YEAR = '(?:,?\\s+(\\d{4}))?';

// Each date form, with its own capture groups, so the match can be read back.
const RELATIVE_DAY = '(today|tomorrow)';
const WEEKDAY = `(?:(next|this)\\s+)?(${WEEKDAYS.join('|')})`;
const MONTH_DAY = `${MONTH}\\s+${ORDINAL}${YEAR}`;
const DAY_MONTH = `${ORDINAL}\\s+(?:of\\s+)?${MONTH}${YEAR}`;
const DATE = `(?:${RELATIVE_DAY}|${WEEKDAY}|${MONTH_DAY}|${DAY_MONTH})`;

// A time is "at 10", "at 10:30", "10am", "3:30 pm" — never a lone number.
const CLOCK = '(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?)?';
const TIME_AFTER = `(?:,?\\s*(?:at|@|by|around)\\s+${CLOCK}|,?\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(a\\.?m\\.?|p\\.?m\\.?))`;

const MENTION_PATTERN = new RegExp(`\\b${DATE}(?:${TIME_AFTER})?(?![\\w:])`, 'gi');

/** Every date phrase in `text`, in order, read against `reference`. */
export function findDateMentions(text: string, reference: Date): DateMention[] {
  const mentions: DateMention[] = [];
  for (const match of text.matchAll(MENTION_PATTERN)) {
    const day = resolveDay(match, reference);
    if (!day) continue;
    const time = resolveTime(match);
    const start = new Date(day);
    if (time) start.setHours(time.hours, time.minutes, 0, 0);
    mentions.push({ index: match.index ?? 0, text: match[0], start, hasTime: time !== null });
  }
  return mentions;
}

/*
 * Group numbers, in the order the pattern declares them:
 *  1 today|tomorrow   2 next|this   3 weekday
 *  4 month 5 day 6 year            (Oct 14, 2026)
 *  7 day 8 month 9 year            (14 October 2026)
 *  10 hour 11 minute 12 meridiem   (at 10:30 pm)
 *  13 hour 14 minute 15 meridiem   (10:30 pm)
 */
function resolveDay(match: RegExpMatchArray, reference: Date): Date | null {
  const today = startOfDay(reference);
  const relative = match[1]?.toLowerCase();
  if (relative === 'today') return today;
  if (relative === 'tomorrow') return addDays(today, 1);

  const weekday = match[3]?.toLowerCase();
  if (weekday) {
    // The coming one, never the reference day itself: "Friday" written on a
    // Friday means a week later. "next" and "this" read the same way — people
    // use both for the coming one, and guessing a week further is worse.
    const ahead = (WEEKDAYS.indexOf(weekday) - today.getDay() + 7) % 7 || 7;
    return addDays(today, ahead);
  }

  const [monthName, dayText, yearText] = match[4]
    ? [match[4], match[5], match[6]]
    : [match[8], match[7], match[9]];
  if (!monthName || !dayText) return null;
  const month = MONTHS[monthName.toLowerCase().replace('.', '')];
  const dayOfMonth = Number(dayText);
  if (month === undefined) return null;

  const build = (year: number) => {
    const date = new Date(year, month, dayOfMonth);
    // 31 February rolls into March; that is not the day anyone wrote.
    return isValid(date) && date.getMonth() === month ? date : null;
  };
  if (yearText) return build(Number(yearText));

  // No year: the coming one. A date more than two months behind the email is
  // next year's — "Jan 5" written in December.
  const thisYear = build(today.getFullYear());
  if (!thisYear) return null;
  const twoMonthsBack = addDays(today, -60);
  return thisYear < twoMonthsBack ? build(today.getFullYear() + 1) : thisYear;
}

function resolveTime(match: RegExpMatchArray): { hours: number; minutes: number } | null {
  const hourText = match[10] ?? match[13];
  if (!hourText) return null;
  const minuteText = match[10] ? match[11] : match[14];
  const meridiem = (match[10] ? match[12] : match[15])?.toLowerCase().replace(/\./g, '');
  let hours = Number(hourText);
  const minutes = minuteText ? Number(minuteText) : 0;
  if (minutes > 59) return null;

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'pm' && hours !== 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
  } else {
    if (hours > 23) return null;
    // "at 3" in a work email is the afternoon, "at 10" the morning: hours 1–6
    // with no am/pm are read as pm.
    if (hours >= 1 && hours <= 6) hours += 12;
  }
  return { hours, minutes };
}

/** What a click on a marked date hands the reading pane. */
export type DateMentionClick = { start: Date; hasTime: boolean };

/**
 * How a date's popover describes it: "Sunday, October 11" over "10:00 AM –
 * 11:00 AM" (the hour the event would take) or "All day", with the year only
 * when it is not this one. Past is from `now`, as the event dialog warns.
 */
export function dateMentionSummary(
  mention: DateMentionClick,
  now: Date = new Date()
): { month: string; day: string; heading: string; detail: string; past: boolean } {
  const { start, hasTime } = mention;
  const heading = format(start, isSameYear(start, now) ? 'EEEE, MMMM d' : 'EEEE, MMMM d, yyyy');
  const detail = hasTime
    ? `${format(start, 'h:mm a')} – ${format(addHours(start, 1), 'h:mm a')}`
    : 'All day';
  const past = hasTime ? start < now : start < startOfDay(now);
  return { month: format(start, 'MMM'), day: format(start, 'd'), heading, detail, past };
}

/** The attribute a marked phrase carries: its start, as ISO, and whether it has a time. */
export const DATE_MENTION_ATTRIBUTE = 'data-elli-date';
export const DATE_MENTION_TIME_ATTRIBUTE = 'data-elli-date-time';

/**
 * Wraps each date phrase in the message body in a span the reading pane can
 * click. Skips quoted history (its relative words belong to an older email),
 * links, and code.
 */
export function markDateMentions(document: Document, reference: Date, skipSelector: string) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest(`a, button, style, script, code, pre, ${skipSelector}`)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  for (const textNode of textNodes) {
    const value = textNode.textContent ?? '';
    const mentions = findDateMentions(value, reference);
    if (mentions.length === 0) continue;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    for (const mention of mentions) {
      if (mention.index > lastIndex) {
        fragment.append(document.createTextNode(value.slice(lastIndex, mention.index)));
      }
      const span = document.createElement('span');
      span.setAttribute(DATE_MENTION_ATTRIBUTE, mention.start.toISOString());
      span.setAttribute(DATE_MENTION_TIME_ATTRIBUTE, String(mention.hasTime));
      span.setAttribute('role', 'button');
      span.setAttribute('tabindex', '0');
      span.setAttribute('aria-haspopup', 'dialog');
      span.textContent = mention.text;
      fragment.append(span);
      lastIndex = mention.index + mention.text.length;
    }
    if (lastIndex < value.length) fragment.append(document.createTextNode(value.slice(lastIndex)));
    textNode.replaceWith(fragment);
  }
}
