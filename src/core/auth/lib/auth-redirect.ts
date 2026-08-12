const AUTH_REDIRECT_BASE = 'https://elli.local';

export function getSafeAuthRedirect(candidate: string | null, fallback = '/app') {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return fallback;

  try {
    const url = new URL(candidate, AUTH_REDIRECT_BASE);

    if (url.origin !== AUTH_REDIRECT_BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: 'Authentication failed. Please try again.',
  auth_callback_error: 'Authentication could not be completed. Please try again.',
  auth_token_error: 'The authentication session could not be created. Please try again.',
  account_not_linked:
    'Your Elli email is not verified for automatic Microsoft sign-in. Contact an administrator, or sign in with your password and connect Microsoft from My Profile.',
  signup_disabled:
    'No active Elli account matches this Microsoft email. Contact an administrator for access.',
  email_not_found:
    'Microsoft did not provide an email address for this account. Contact your Microsoft administrator.',
  email_is_missing:
    'Microsoft did not provide an email address for this account. Contact your Microsoft administrator.',
  "email_doesn't_match": 'Your Microsoft email must match your Elli account email.',
  email_doesnt_match: 'Your Microsoft email must match your Elli account email.',
  account_already_linked_to_different_user:
    'This Microsoft account is already connected to another Elli user.',
  oauth2_failed: 'Microsoft sign-in could not be completed. Please try again.',
  oauth_provider_not_found: 'Microsoft sign-in is not configured for this environment.',
  invalid_callback_request: 'The Microsoft sign-in response was invalid. Please try again.',
  invalid_code: 'The Microsoft sign-in request expired or was invalid. Please try again.',
  no_code: 'Microsoft did not return a sign-in code. Please try again.',
  unable_to_link_account: 'The Microsoft account could not be connected to your Elli account.',
  unable_to_get_user_info: 'Microsoft could not provide the required account details.',
  state_mismatch: 'The Microsoft sign-in request expired or was invalid. Please try again.',
  access_denied: 'Microsoft sign-in was cancelled or denied.',
};

export function getAuthCallbackErrorMessage(errorCode: string | null) {
  if (!errorCode) return null;
  return AUTH_ERROR_MESSAGES[errorCode] ?? 'Authentication failed. Please try again.';
}
