import { beforeAll, describe, expect, mock, test } from 'bun:test';

import type { AccessPermissions, AppRole } from '../src/app/api/access';
import type {
  filterMenuForAccess as FilterMenuForAccess,
  SidebarAccess,
} from '../src/app/components/sidebar/sidebar-access';
import type { MenuConfig } from '../src/app/config/types';

/**
 * Project Executives and Loans are for administrators only — dev and admin —
 * and so is their place in the sidebar. Both were placeholders every role
 * could see; they now carry the `projectExecutive` / `loan` read grants that
 * elli-core gives dev and admin alone. A role left with nothing under Finance
 * does not see the group at all.
 *
 * Runs against the real `mainSidebarMenu`. Its custom entries render
 * components whose imports reach Vite-only modules (`virtual:pwa-register`),
 * so those three are stubbed: only the menu data is under test here.
 */

mock.module('@/modules/email/components/email-sidebar-menu', () => ({
  EmailSidebarMenu: () => null,
}));
mock.module('@/modules/project/components/project-sidebar-switcher', () => ({
  ProjectSidebarSwitcher: () => null,
}));
mock.module('@/modules/quick-shortcuts/components/quick-shortcuts-sidebar-menu', () => ({
  QuickShortcutsSidebarMenu: () => null,
}));

let mainSidebarMenu: MenuConfig;
let filterMenuForAccess: typeof FilterMenuForAccess;

beforeAll(async () => {
  ({ mainSidebarMenu } = await import('../src/app/routing/config/sidebar'));
  ({ filterMenuForAccess } = await import('../src/app/components/sidebar/sidebar-access'));
});

const ADMIN_ONLY = ['Project Executives', 'Loans'];

type AccessOptions = {
  permissions?: AccessPermissions;
  /** An accountant granted the Check Register (`checkingRegisterAccess`). */
  checkingRegisterGrant?: boolean;
};

// What `GET /users/me/access` carries for each role, as far as the Finance
// group reads it: the two grants follow elli-core's role matrix, and the
// Check Register rule is `resolveAccess`'s — administrators, and accountants
// holding a grant.
function accessFor(role: AppRole, options: AccessOptions = {}): SidebarAccess {
  const isAdministrator = role === 'dev' || role === 'admin';
  const permissions = options.permissions ?? {
    projectExecutive: isAdministrator ? ['read'] : [],
    loan: isAdministrator ? ['read'] : [],
  };
  const canAccessCheckingRegister =
    isAdministrator || (role === 'accountant' && options.checkingRegisterGrant === true);

  return {
    access: {
      userId: 'user-1',
      role,
      isDev: role === 'dev',
      isAdmin: isAdministrator,
      canAccessCheckingRegister,
      employeeId: null,
      projectScope: 'all',
      permissions,
    },
    isDev: role === 'dev',
    isAdmin: isAdministrator,
    canAccessCheckingRegister,
    can: (resource, action) => permissions[resource]?.includes(action) ?? false,
  };
}

function financeGroup(access: SidebarAccess) {
  return filterMenuForAccess(mainSidebarMenu, false, access, undefined).find(
    (item) => item.title === 'Finance'
  );
}

const financeTitles = (access: SidebarAccess) =>
  (financeGroup(access)?.children ?? []).map((child) => child.title);

describe('the Finance sidebar group', () => {
  for (const role of ['dev', 'admin'] as const) {
    test(`lists Project Executives and Loans for ${role}`, () => {
      expect(financeTitles(accessFor(role))).toEqual(expect.arrayContaining(ADMIN_ONLY));
    });
  }

  test('shows an accountant with the Check Register only that, without the admin entries', () => {
    expect(financeTitles(accessFor('accountant', { checkingRegisterGrant: true }))).toEqual([
      'Check Register',
    ]);
  });

  // With Project Executives and Loans gone, these roles have nothing left in
  // Finance, so the group goes too rather than showing an empty heading.
  for (const role of ['accountant', 'ap', 'pm', 'user'] as const) {
    test(`is left out entirely for ${role} with nothing in it`, () => {
      expect(financeGroup(accessFor(role))).toBeUndefined();
    });
  }

  test('follows the grant, not the role name', () => {
    // An administrator whose access carries no grant — an API from before the
    // grants existed, say — sees neither, rather than a guess.
    const titles = financeTitles(accessFor('admin', { permissions: {} }));

    for (const title of ADMIN_ONLY) expect(titles).not.toContain(title);
    expect(titles).toContain('Check Register');
  });
});
