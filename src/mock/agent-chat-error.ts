/**
 * The message under the chat when Elliot's request fails. The AI SDK's
 * transport throws an Error whose message is the raw response body, so a
 * rejected request arrives as `{"error":"Unauthorized"}` — not something to
 * show a person, and not something to hide behind one generic sentence either.
 */
export function describeAgentChatError(error: Error | undefined): string {
  const fallback = 'Elliot could not complete that request. Try again in a moment.';
  if (!error) return fallback;

  const raw = error.message.trim();
  let serverError: string | undefined;
  try {
    const body: unknown = JSON.parse(raw);
    if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
      serverError = body.error;
    }
  } catch {
    // Not JSON: a network failure or a plain-text body. Read it as is below.
  }

  const reason = (serverError ?? raw).toLowerCase();
  if (reason === 'unauthorized') {
    return 'Elliot could not confirm you are signed in. Refresh the page or sign in again.';
  }
  if (reason === 'forbidden') {
    return 'Your role does not include Elliot. Ask an admin to give you assistant access.';
  }
  if (reason.includes('failed to fetch') || reason.includes('networkerror')) {
    return 'Elliot could not reach the server. Check your connection and try again.';
  }
  return serverError ? `Elliot could not complete that request: ${serverError}` : fallback;
}
