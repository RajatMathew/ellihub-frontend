import { describe, expect, test } from 'bun:test';

import { startsInPast } from '../src/modules/email/lib/calendar-event-form';
import {
  DATE_MENTION_ATTRIBUTE,
  dateMentionSummary,
  findDateMentions,
  markDateMentions,
} from '../src/modules/email/lib/email-date-mentions';

// elli-ui#686: dates written in an email are underlined, and a click turns one
// into a calendar event. Relative words are read against the email's own date.
// The suite runs on a New York clock; every date here is built in local time.

// Thursday, 8 October 2026, mid-morning.
const SENT = new Date(2026, 9, 8, 9, 15);

const at = (month: number, day: number, hours = 0, minutes = 0, year = 2026) =>
  new Date(year, month, day, hours, minutes);

function only(text: string) {
  const mentions = findDateMentions(text, SENT);
  expect(mentions).toHaveLength(1);
  return mentions[0]!;
}

describe('a date in an email', () => {
  test('"tomorrow, at 10" is the next morning at ten — the Zoho example', () => {
    const mention = only("We can discuss further tomorrow, at 10 or 11 if you're available.");

    expect(mention.text).toBe('tomorrow, at 10');
    expect(mention.start).toEqual(at(9, 9, 10));
    expect(mention.hasTime).toBe(true);
  });

  test('is read against the email, not today', () => {
    const lastWeek = new Date(2026, 9, 1, 9, 0);

    expect(findDateMentions('see you tomorrow', lastWeek)[0]!.start).toEqual(at(9, 2));
  });

  test('without a time is a whole day', () => {
    const mention = only('Delivery is today.');

    expect(mention.start).toEqual(at(9, 8));
    expect(mention.hasTime).toBe(false);
  });

  test('a weekday is the coming one, a week on when it is that day already', () => {
    expect(only('Can we meet Monday?').start).toEqual(at(9, 12));
    expect(only('Can we meet next Tuesday?').start).toEqual(at(9, 13));
    expect(only('Same time Thursday?').start).toEqual(at(9, 15));
  });

  test('a month and day, either way round, with or without a year', () => {
    expect(only('Site visit on Oct 14 at 3pm.').start).toEqual(at(9, 14, 15));
    expect(only('Site visit on 14th October.').start).toEqual(at(9, 14));
    expect(only('Closing March 3, 2027').start).toEqual(at(2, 3, 0, 0, 2027));
  });

  test('a month and day long gone this year means next year', () => {
    expect(only('Kick-off is Jan 5').start).toEqual(at(0, 5, 0, 0, 2027));
    expect(only('Invoice dated Sep 30').start).toEqual(at(8, 30));
  });

  test('reads times the way they are written', () => {
    expect(only('Friday at 9:30 am').start).toEqual(at(9, 9, 9, 30));
    expect(only('Friday 4:45 PM').start).toEqual(at(9, 9, 16, 45));
    expect(only('Friday at 12pm').start).toEqual(at(9, 9, 12));
    // No am/pm: early hours are the afternoon in a work email.
    expect(only('Friday at 3').start).toEqual(at(9, 9, 15));
  });

  test('leaves alone what is not unambiguously a day', () => {
    for (const text of [
      'Call me at 10',
      'Sent on 10/11',
      'We sat down and talked',
      'Mondays are busy',
      'You may 2x the order',
      'February 31 does not exist',
    ]) {
      expect(findDateMentions(text, SENT)).toEqual([]);
    }
  });
});

describe('marking dates in the message body', () => {
  const body = (html: string) =>
    new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

  test('wraps the phrase, keeping the text around it', () => {
    const document = body('<p>We can talk tomorrow, at 10 or later.</p>');

    markDateMentions(document, SENT, '[data-quoted]');

    const span = document.querySelector(`[${DATE_MENTION_ATTRIBUTE}]`)!;
    expect(span.textContent).toBe('tomorrow, at 10');
    expect(span.getAttribute(DATE_MENTION_ATTRIBUTE)).toBe(at(9, 9, 10).toISOString());
    expect(document.body.textContent).toBe('We can talk tomorrow, at 10 or later.');
  });

  test('skips quoted history, links and code', () => {
    const document = body(
      '<a href="#">tomorrow</a><code>Monday</code><div data-quoted><p>tomorrow</p></div>'
    );

    markDateMentions(document, SENT, '[data-quoted]');

    expect(document.querySelectorAll(`[${DATE_MENTION_ATTRIBUTE}]`)).toHaveLength(0);
  });
});

describe('the warning on a new event made from an older email', () => {
  const NOW = new Date(2026, 9, 10, 14, 0);

  test('shows for a time already gone', () => {
    expect(startsInPast({ date: '2026-10-09', startTime: '10:00', allDay: false }, NOW)).toBe(true);
    expect(startsInPast({ date: '2026-10-10', startTime: '13:30', allDay: false }, NOW)).toBe(true);
  });

  test('does not show for a time still to come', () => {
    expect(startsInPast({ date: '2026-10-10', startTime: '15:00', allDay: false }, NOW)).toBe(
      false
    );
  });

  test('an all-day event today is not past yet; yesterday is', () => {
    expect(startsInPast({ date: '2026-10-10', startTime: '00:00', allDay: true }, NOW)).toBe(false);
    expect(startsInPast({ date: '2026-10-09', startTime: '00:00', allDay: true }, NOW)).toBe(true);
  });
});

describe('the popover above a date', () => {
  const NOW = new Date(2026, 9, 10, 14, 0);

  test('names the day and the hour the event would take', () => {
    expect(dateMentionSummary({ start: at(9, 11, 10), hasTime: true }, NOW)).toEqual({
      month: 'Oct',
      day: '11',
      heading: 'Sunday, October 11',
      detail: '10:00 AM – 11:00 AM',
      past: false,
    });
  });

  test('says all day for a date written without a time, and when it is past', () => {
    expect(dateMentionSummary({ start: at(9, 9), hasTime: false }, NOW)).toMatchObject({
      detail: 'All day',
      past: true,
    });
    expect(dateMentionSummary({ start: at(9, 10), hasTime: false }, NOW).past).toBe(false);
  });

  test('gives the year only when it is not this one', () => {
    expect(dateMentionSummary({ start: at(2, 3, 0, 0, 2027), hasTime: false }, NOW).heading).toBe(
      'Wednesday, March 3, 2027'
    );
  });
});
