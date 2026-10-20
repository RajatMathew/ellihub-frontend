/**
 * Sign-in links ("magic links").
 *
 * The email links to this app's `/sign-in#magic-link=<token>`, not to the API:
 * mail scanners open every link in a message, and the API's verify URL signs
 * in and spends the token on a plain GET. Here the token waits for a click.
 *
 * The token is in the fragment, which the browser never sends anywhere, and
 * `captureMagicLinkToken` takes it out of the address bar before analytics
 * starts — so it is in no page view, no referrer and no history entry. The
 * Continue button then opens the API's verify URL in the browser, which sets
 * the session cookie and redirects back, the way Microsoft sign-in does.
 */

export const MAGIC_LINK_FRAGMENT_KEY = 'magic-link';

/** Better Auth's tokens are 32 letters; allow some room, refuse anything else. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;

/** The token in a URL fragment such as `#magic-link=abc`, or null. */
export function readMagicLinkToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get(MAGIC_LINK_FRAGMENT_KEY);
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

const TOKEN_IN_TEXT = new RegExp(`([#?&]${MAGIC_LINK_FRAGMENT_KEY}=)[^&#\\s"']*`, 'g');

/** `value` with any sign-in link token in it replaced. */
export function redactMagicLinkToken(value: string): string {
  return value.replace(TOKEN_IN_TEXT, '$1[redacted]');
}

type EventProperties = Record<string, unknown>;

function redactProperties(properties: EventProperties): EventProperties {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      typeof value === 'string' ? redactMagicLinkToken(value) : value,
    ])
  );
}

/**
 * An analytics event (PostHog's `before_send`) with any sign-in link token
 * removed from its URL-bearing properties. A backstop only: the token leaves
 * the address bar before analytics starts.
 */
export function redactMagicLinkTokensInEvent<
  T extends { properties: EventProperties; $set?: EventProperties; $set_once?: EventProperties },
>(event: T | null): T | null {
  if (!event) return event;
  return {
    ...event,
    properties: redactProperties(event.properties),
    ...(event.$set && { $set: redactProperties(event.$set) }),
    ...(event.$set_once && { $set_once: redactProperties(event.$set_once) }),
  };
}

let capturedToken: string | null = null;
const listeners = new Set<() => void>();

function setCapturedToken(token: string | null) {
  if (token === capturedToken) return;
  capturedToken = token;
  for (const listener of listeners) listener();
}

/**
 * Takes a sign-in link token out of the address bar and keeps it for the
 * sign-in page.
 */
export function captureMagicLinkToken(
  location: Pick<Location, 'hash' | 'pathname' | 'search'> = window.location,
  history: Pick<History, 'state' | 'replaceState'> = window.history
): void {
  if (!location.hash.includes(`${MAGIC_LINK_FRAGMENT_KEY}=`)) return;
  const token = readMagicLinkToken(location.hash);

  // Removed even when malformed: nothing about it belongs in the URL.
  history.replaceState(history.state, '', `${location.pathname}${location.search}`);
  if (token) setCapturedToken(token);
}

/**
 * Captures a token now and whenever one arrives later. Called at startup,
 * before analytics records the URL. A link opened in a tab already showing
 * the app changes only the fragment — no page load — so the fragment events
 * are watched too; `popstate` fires first, ahead of analytics' own listener.
 */
export function watchForMagicLinkTokens(target: Window = window): void {
  const capture = () => captureMagicLinkToken(target.location, target.history);
  capture();
  target.addEventListener('popstate', capture);
  target.addEventListener('hashchange', capture);
}

export function getCapturedMagicLinkToken(): string | null {
  return capturedToken;
}

export function clearCapturedMagicLinkToken(): void {
  setCapturedToken(null);
}

/** For `useSyncExternalStore`: re-render when a token is captured or cleared. */
export function subscribeToCapturedMagicLinkToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Where the Continue button sends the browser: the API's verify endpoint,
 * which redirects to `next` signed in, or back to the sign-in page with
 * `?error=` when the link is used, expired or unknown.
 */
export function buildMagicLinkVerifyUrl(params: {
  verifyEndpoint: URL;
  appOrigin: string;
  token: string;
  next: string;
}): string {
  const url = new URL(params.verifyEndpoint);
  url.searchParams.set('token', params.token);
  url.searchParams.set('callbackURL', new URL(params.next, params.appOrigin).toString());
  url.searchParams.set(
    'errorCallbackURL',
    new URL(`/sign-in?next=${encodeURIComponent(params.next)}`, params.appOrigin).toString()
  );
  return url.toString();
}

/**
 * Whether the API offers sign-in links (`GET /auth/config`). An API from
 * before them reports no `methods`, and then they are not offered.
 */
export function isMagicLinkEnabled(
  capabilities: { methods?: { magicLink?: boolean } } | null | undefined
): boolean {
  return capabilities?.methods?.magicLink === true;
}

/** One link a minute per address: the API refuses a second one sooner. */
export const MAGIC_LINK_RESEND_COOLDOWN_MS = 60_000;

/** Whole seconds from `now` until `until` (both epoch ms); 0 once it has passed. */
export function secondsUntil(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

/** What to tell someone whose request for a link failed, by the response status. */
export function getMagicLinkRequestErrorMessage(status: number | undefined): string {
  if (status === 429) return 'Too many sign-in requests. Wait a minute and try again.';
  if (status === 404)
    return 'Sign-in links are not available right now. Try another way to sign in.';
  return 'The sign-in link could not be sent. Please try again.';
}
