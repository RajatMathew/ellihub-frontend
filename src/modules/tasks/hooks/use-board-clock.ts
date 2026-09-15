import { useEffect, useState } from 'react';

import { format } from 'date-fns';

/**
 * What time it is, for a board that stays open.
 *
 * "Today" used to be read once when the board mounted. Left open overnight the
 * columns were a day behind - yesterday's cards still under Due Today - and a
 * drop into "Tomorrow" saved what was by then today's date. So the clock is
 * re-read at midnight and whenever the tab comes back into view, which is when
 * a stale board is actually looked at.
 *
 * `today` and `tz` are what the board request carries: the server cuts the
 * columns on the caller's day, and putting the day in the query key is what
 * makes a board left open fetch afresh once the date turns.
 */
export interface BoardClock {
  now: Date;
  /** Local calendar date, `YYYY-MM-DD`. Changes exactly when the columns must. */
  today: string;
  /** The browser's IANA zone, for the server to cut the day on. */
  tz: string;
}

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function read(): BoardClock {
  const now = new Date();
  return { now, today: format(now, 'yyyy-MM-dd'), tz: timeZone };
}

function msUntilMidnight(now: Date): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  // A second past, so a timer that fires a hair early does not read the old day.
  return next.getTime() - now.getTime() + 1000;
}

export function useBoardClock(): BoardClock {
  const [clock, setClock] = useState(read);

  useEffect(() => {
    // Only when the day has actually changed: `now` is a fresh object every
    // read, and handing the board a new one for no change would re-derive
    // every column each time the tab is focused.
    const refresh = () => setClock((prev) => (read().today === prev.today ? prev : read()));

    let timer = window.setTimeout(function tick() {
      refresh();
      timer = window.setTimeout(tick, msUntilMidnight(new Date()));
    }, msUntilMidnight(clock.now));

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [clock.now]);

  return clock;
}
