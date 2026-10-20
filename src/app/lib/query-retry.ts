/**
 * Whether a failed query is worth asking for again.
 *
 * The client default was a bare `retry: 1`, which retries everything — so a
 * 401, a 403 and a 404 were each requested twice. None of those can change by
 * asking again: the caller is not signed in, is not allowed, or the record does
 * not exist. It doubles the load behind every permission-denied screen and
 * doubles the time the user waits to be told.
 *
 * A 408 and a 429 are the exceptions in the 4xx range — a timeout and a rate
 * limit are both explicitly "try later" — so they retry like a 5xx.
 *
 * A failure with no status at all (the network is down, the request was
 * aborted, DNS failed) is retried: that is the case a retry exists for.
 */

const RETRYABLE_CLIENT_STATUSES = new Set([408, 429]);

const MAX_ATTEMPTS = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The HTTP status of an Axios-shaped error, if it carries one. */
export function getErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;

  const response = error.response;
  if (isRecord(response) && typeof response.status === 'number') return response.status;

  // Axios also copies the status onto the error itself in some versions.
  return typeof error.status === 'number' ? error.status : undefined;
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_ATTEMPTS) return false;

  const status = getErrorStatus(error);
  if (status === undefined) return true;

  if (status >= 400 && status < 500) return RETRYABLE_CLIENT_STATUSES.has(status);

  return true;
}
