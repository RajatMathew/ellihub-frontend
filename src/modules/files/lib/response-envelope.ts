/**
 * The payload of an elli-core response.
 *
 * The API answers `{ success, message, data }`, and `data` is the answer even
 * when it is `null`: `GET /file/export/active` sends `data: null` when no export
 * is running. Unwrapping with `body?.data ?? body` treats that null as missing
 * and hands the whole envelope to the parser instead, which rejected it and
 * logged a Zod error on every Files page load. A body with no `data` key at all
 * is returned as it is.
 */
export function readEnvelopeData(body: unknown): unknown {
  if (typeof body === 'object' && body !== null && 'data' in body) {
    return body.data;
  }

  return body;
}
