import { SUITE_TIME_ZONE } from './setup-time-zone';

/**
 * For tests that run code as if the viewer's clock were in another zone.
 *
 * `process.env.TZ` is process-wide, so a test that changes it must put it back
 * for the files that run after it. Put back the suite's pinned zone: Bun does
 * not return to the machine's own zone when `TZ` is deleted, and assigning
 * `undefined` stores the string "undefined", which reads as UTC.
 */

export function setViewerTimeZone(zone: string): void {
  process.env.TZ = zone;
}

export function restoreViewerTimeZone(): void {
  process.env.TZ = SUITE_TIME_ZONE;
}
