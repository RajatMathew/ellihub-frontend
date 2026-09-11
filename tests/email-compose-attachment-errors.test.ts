import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, test } from 'bun:test';

import { getAttachmentTransportErrorMessage } from '../src/modules/email/lib/email-compose-attachments';

function axiosFailure(options: { code?: string; status?: number }): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response: AxiosResponse | undefined =
    options.status === undefined
      ? undefined
      : {
          data: null,
          status: options.status,
          statusText: '',
          headers: new AxiosHeaders(),
          config,
        };
  return new AxiosError('Request failed', options.code, config, null, response);
}

describe('attachment preparation transport errors', () => {
  test('names the timeout so the user knows to retry', () => {
    expect(getAttachmentTransportErrorMessage(axiosFailure({ code: 'ECONNABORTED' }))).toContain(
      'timed out'
    );
  });

  test('a request that never reached the server says so', () => {
    expect(getAttachmentTransportErrorMessage(axiosFailure({}))).toContain('Could not reach');
  });

  test('separates a refused size from a server fault', () => {
    expect(getAttachmentTransportErrorMessage(axiosFailure({ status: 413 }))).toContain(
      'too large'
    );
    expect(getAttachmentTransportErrorMessage(axiosFailure({ status: 502 }))).toContain(
      'mail server'
    );
  });

  test("defers to the server's own reason on a 4xx, and to the caller otherwise", () => {
    expect(getAttachmentTransportErrorMessage(axiosFailure({ status: 409 }))).toBeNull();
    expect(getAttachmentTransportErrorMessage(new Error('Could not read clip.mp4'))).toBeNull();
    expect(getAttachmentTransportErrorMessage(undefined)).toBeNull();
  });
});
