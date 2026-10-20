/**
 * Password sign-in can be switched off on the server
 * (`AUTH_PASSWORD_SIGN_IN_ENABLED`), which `GET /auth/config` reports as
 * `methods.password`. Off, every password endpoint answers 404, so nothing
 * that signs in with, sets or changes a password is offered.
 */

/** Whether password sign-in is on. An API from before the switch does not report it: on. */
export function isPasswordSignInEnabled(
  capabilities: { methods?: { password?: boolean } } | null | undefined
): boolean {
  return capabilities?.methods?.password !== false;
}

/**
 * Whether the signed-in user has a password: Better Auth keeps one as an
 * account with the `credential` provider. An account created without one
 * signs in by emailed link or Microsoft.
 */
export function hasPasswordAccount(accounts: readonly { providerId: string }[]): boolean {
  return accounts.some((account) => account.providerId === 'credential');
}
