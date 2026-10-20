import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, test } from 'bun:test';

import { isEventGone } from '../src/modules/email/lib/calendar-event-errors';

/**
 * A linked event's link used to be dropped whenever the calendar list came back
 * without it — which it did for every reader who had never picked calendars.
 * Now only the provider saying the event does not exist may even offer to.
 */
const failed = (status?: number) =>
  new AxiosError(
    'failed',
    status ? String(status) : 'ECONNABORTED',
    undefined,
    undefined,
    status
      ? { status, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: {} }
      : undefined
  );

describe('a linked event that will not open', () => {
  test('is gone only when the provider says it does not exist', () => {
    expect(isEventGone(failed(404))).toBe(true);
  });

  test('is not gone on a timeout, a server error, a refusal or a rate limit', () => {
    for (const error of [failed(), failed(500), failed(403), failed(429), failed(503)]) {
      expect(isEventGone(error)).toBe(false);
    }
    expect(isEventGone(new Error('boom'))).toBe(false);
  });
});
