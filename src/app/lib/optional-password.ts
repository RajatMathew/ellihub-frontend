import { z } from 'zod';

/**
 * A password typed when creating a login, or none: an account created without
 * one signs in by emailed link or Microsoft, and can set one from My Profile.
 * The API's rule exactly - blank, or 8 to 128 characters.
 */
export const optionalPasswordSchema = z
  .string()
  .max(128, 'Password must be at most 128 characters')
  .refine(
    (value) => value.trim() === '' || value.length >= 8,
    'Password must be at least 8 characters'
  )
  .optional();

/** The password to send with a new login: none when it is blank, or not wanted. */
export function passwordIfGiven(password: string | undefined): { password?: string } {
  return password && password.trim() !== '' ? { password } : {};
}
