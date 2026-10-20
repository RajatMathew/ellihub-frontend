import { describe, expect, test } from 'bun:test';

import { optionalPasswordSchema, passwordIfGiven } from '../src/app/lib/optional-password';
import {
  createEmployeeInputSchema,
  linkEmployeeUserInputSchema,
} from '../src/modules/hr/schemas/employee.schema';
import {
  memberCreateSchema,
  memberFormSchema,
} from '../src/modules/settings/schemas/members.schema';

/**
 * A login can be created without a password: the person signs in by emailed
 * link or Microsoft and can set one later. A password typed is still checked,
 * and a blank field is never sent as an empty password.
 */
const member = { name: 'Ann', email: 'ann@ellicorp.com', role: 'pm' };
const employee = {
  name: 'Priya Nair',
  email: 'priya@example.com',
  roleLabel: 'Project Engineer',
  createAccount: true,
  authRole: 'pm',
};

describe('a password for a new login', () => {
  test('may be left out or blank', () => {
    expect(optionalPasswordSchema.safeParse(undefined).success).toBe(true);
    expect(optionalPasswordSchema.safeParse('').success).toBe(true);
  });

  test('is checked when typed, as the API checks it', () => {
    expect(optionalPasswordSchema.safeParse('short').success).toBe(false);
    expect(optionalPasswordSchema.safeParse('x'.repeat(129)).success).toBe(false);
    expect(optionalPasswordSchema.safeParse('correct horse').success).toBe(true);
  });

  test('is sent only when there is one', () => {
    expect(passwordIfGiven('correct horse')).toEqual({ password: 'correct horse' });
    expect(passwordIfGiven('')).toEqual({});
    expect(passwordIfGiven('   ')).toEqual({});
    expect(passwordIfGiven(undefined)).toEqual({});
  });
});

describe('creating a member', () => {
  test('needs no password', () => {
    expect(memberCreateSchema.safeParse(member).success).toBe(true);
    expect(memberFormSchema.safeParse({ ...member, password: '' }).success).toBe(true);
  });

  test('still rejects a password that is too short', () => {
    expect(memberFormSchema.safeParse({ ...member, password: 'short' }).success).toBe(false);
  });
});

describe("creating or linking an employee's login", () => {
  test('needs a role but no password', () => {
    expect(createEmployeeInputSchema.safeParse({ ...employee, password: '' }).success).toBe(true);
    expect(createEmployeeInputSchema.safeParse({ ...employee, authRole: undefined }).success).toBe(
      false
    );
    expect(linkEmployeeUserInputSchema.safeParse({ role: 'pm', password: '' }).success).toBe(true);
  });

  test('still rejects a password that is too short', () => {
    expect(createEmployeeInputSchema.safeParse({ ...employee, password: 'short' }).success).toBe(
      false
    );
    expect(linkEmployeeUserInputSchema.safeParse({ role: 'pm', password: 'short' }).success).toBe(
      false
    );
  });
});
