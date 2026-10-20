export type SignInMethod = 'password' | 'magic-link';

/**
 * What the sign-in page shows: a form; a placeholder while it learns which it
 * may offer; or neither, when only a social provider is left (the server
 * refuses to start with no way to sign in at all).
 */
export type SignInView = SignInMethod | 'loading' | 'social-only';

/**
 * The method the page opens on before anyone picks one: none, so the sign-in
 * link is offered first — except straight after a password reset, where the
 * person has just chosen a password and came to use it.
 */
export function getInitialSignInMethod(searchParams: URLSearchParams): SignInMethod | null {
  return searchParams.get('pwd_reset') === 'success' ? 'password' : null;
}

/**
 * Which form to show. The sign-in link is preferred whenever the API offers
 * it; until the API has said what it offers, a placeholder stands in, so the
 * password form does not flash up and then vanish. The password form is shown
 * only while password sign-in is on — and if the API cannot be asked, it is
 * assumed on, as it is by default.
 */
export function resolveSignInView(params: {
  chosen: SignInMethod | null;
  capabilities: 'loading' | 'loaded' | 'error';
  magicLinkEnabled: boolean;
  passwordEnabled: boolean;
}): SignInView {
  if (params.capabilities === 'loading') {
    return params.chosen === 'password' ? 'password' : 'loading';
  }
  const password = params.capabilities === 'error' || params.passwordEnabled;
  const magicLink = params.capabilities === 'loaded' && params.magicLinkEnabled;

  if (params.chosen === 'password' && password) return 'password';
  if (magicLink) return 'magic-link';
  if (password) return 'password';
  return 'social-only';
}

/**
 * Whether a sign-in link opened from an email is offered a Continue button.
 * Only a definite "off" from the API says no - an old email outlives the
 * switch. While the API is being asked, or cannot be, Continue is offered and
 * the API answers the link itself, sending it back here with the reason.
 */
export function canContinueWithSignInLink(
  capabilities: 'loading' | 'loaded' | 'error',
  magicLinkEnabled: boolean
): boolean {
  return capabilities !== 'loaded' || magicLinkEnabled;
}
