import { useEffect, useRef, type RefObject } from 'react';

// Shared timeline geometry for the week and day views. The visual chrome
// (hour rail, hour lines, now indicator) lives in email-calendar-grid-chrome.
//
// The grid covers the full 24-hour day (Google/Outlook style) so an event can
// never land outside the canvas — late-night site visits used to render as
// orphaned pills floating below the grid. The scroll container opens at the
// workday instead of midnight via useScrollToWorkday.
export const CALENDAR_START_HOUR = 0;
export const CALENDAR_END_HOUR = 24;
export const CALENDAR_HOUR_HEIGHT = 56; // px
// Where the viewport lands when a timeline view mounts.
export const CALENDAR_SCROLL_TO_HOUR = 7;

export const CALENDAR_HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR },
  (_, index) => CALENDAR_START_HOUR + index
);

export function formatCalendarHour(hour: number): string {
  const h = ((hour + 11) % 12) + 1;
  const suffix = hour < 12 ? 'am' : 'pm';
  return `${h} ${suffix}`;
}

/**
 * Scroll a timeline view to the start of the workday on mount. The sticky
 * header occupies the same height inside the scroll content as it overlays
 * once scrolled, so `hour * CALENDAR_HOUR_HEIGHT` lands the hour line exactly
 * under the header.
 */
export function useScrollToWorkday(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: CALENDAR_SCROLL_TO_HOUR * CALENDAR_HOUR_HEIGHT });
  }, []);
  return ref;
}
