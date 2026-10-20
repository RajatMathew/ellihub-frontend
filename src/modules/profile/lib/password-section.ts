/** What My Profile > Security shows for the user's password. */
export type PasswordSectionState = 'loading' | 'hidden' | 'change' | 'set';

/**
 * - Password sign-in off: nothing — every password endpoint answers 404.
 * - The user has a password: the change-password form.
 * - They have none (an account created without one): a button that emails
 *   them a link to set one, which also proves the mailbox is theirs.
 * If their sign-in methods cannot be loaded, the change form shows, as it did
 * before any of this was known.
 */
export function getPasswordSectionState(params: {
  status: 'pending' | 'error' | 'success';
  passwordEnabled: boolean;
  hasPassword: boolean;
}): PasswordSectionState {
  if (params.status === 'pending') return 'loading';
  if (params.status === 'error') return 'change';
  if (!params.passwordEnabled) return 'hidden';
  return params.hasPassword ? 'change' : 'set';
}
