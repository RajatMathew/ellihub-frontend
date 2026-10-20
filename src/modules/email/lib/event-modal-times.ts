/**
 * The event modal's time lists (elli-ui#1379). Pure, so the end list's
 * durations and the start's keep-the-length rule are tested directly.
 */

export const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const timeOfMinutes = (total: number) =>
  `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

/** Every quarter hour of the day. */
export function startTimeOptions(): string[] {
  return Array.from({ length: 96 }, (_, index) => timeOfMinutes(index * 15));
}

/** Quarter hours after the start, up to twelve hours on, never past midnight. */
export function endTimeOptions(startTime: string): string[] {
  const start = minutesOf(startTime);
  const out: string[] = [];
  for (let step = 15; step <= 720 && start + step < 1440; step += 15) {
    out.push(timeOfMinutes(start + step));
  }
  if (start + 15 >= 1440) out.push('23:59');
  return out;
}

/** "45m", "1h", "1h 30m". */
export function durationLabel(minutes: number): string {
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours && rest ? `${hours}h ${rest}m` : hours ? `${hours}h` : `${rest}m`;
}

/** "IST", "EDT" — the zone as a short tag, or its city when it has none. */
export function zoneShortName(timeZone: string, now: Date = new Date()): string {
  try {
    const short = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
      .formatToParts(now)
      .find((part) => part.type === 'timeZoneName')?.value;
    if (short && !/^GMT[+-]/.test(short)) return short;
    return timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone;
  } catch {
    return timeZone;
  }
}
