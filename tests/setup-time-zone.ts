/**
 * Every unit test runs on a New York clock — where Elli's users are — whatever
 * machine runs it. Loaded via `bunfig.toml`'s test preload.
 *
 * Tests used to run in the developer's own zone (India), where a calendar date
 * stored as UTC midnight reads correctly, so every "shows the day before in New
 * York" bug passed here. Pinning the zone makes the result the same on every
 * machine and puts it where the users are.
 */

export const SUITE_TIME_ZONE = 'America/New_York';

process.env.TZ = SUITE_TIME_ZONE;
