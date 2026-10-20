import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * Creating a member without a password, and what the Members page offers when
 * password sign-in is switched off on the server.
 */

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;
const CURRENT_USER_ID = 'user-me';

const member = (id: string, name: string, role: string) => ({
  banned: false,
  checkingRegisterAccess: false,
  createdAt: NOW,
  email: `${id}@example.com`,
  emailVerified: true,
  id,
  name,
  role,
  updatedAt: NOW,
});
const MEMBERS = [
  member(CURRENT_USER_ID, 'Current Admin', 'admin'),
  member('user-member-1', 'Plain Member', 'user'),
];

async function mockMembersApi(page: Page, { password }: { password: boolean }) {
  const created: unknown[] = [];

  await page.route('**/api/v1/**', async (route: Route, request: Request) => {
    const path = new URL(request.url()).pathname;

    if (path === '/api/v1/auth/config') {
      await route.fulfill({
        json: { providers: { microsoft: false }, methods: { password, magicLink: true } },
      });
      return;
    }
    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { expiresAt: '2026-12-31T00:00:00Z', id: 'session-1', userId: CURRENT_USER_ID },
          user: { email: 'me@example.com', id: CURRENT_USER_ID, name: 'Current Admin' },
        },
      });
      return;
    }
    if (path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            employeeId: 'employee-me',
            isAdmin: true,
            isDev: false,
            permissions: { user: ['manage-permissions'] },
            projectScope: 'all',
            role: 'admin',
            userId: CURRENT_USER_ID,
          },
        },
      });
      return;
    }
    if (path === '/api/v1/users' && request.method() === 'POST') {
      created.push(request.postDataJSON());
      await route.fulfill({ json: { data: member('user-new', 'New Person', 'pm') } });
      return;
    }
    if (path === '/api/v1/users') {
      await route.fulfill({
        json: {
          data: MEMBERS,
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            itemsPerPage: 25,
            totalItems: MEMBERS.length,
            totalPages: 1,
          },
        },
      });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });

  return created;
}

async function gotoMembers(page: Page) {
  await page.goto('/app/settings/members');
  await expect(page.getByRole('table', { name: 'Members' })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
}

test('a member can be created without a password', async ({ page }) => {
  const created = await mockMembersApi(page, { password: true });
  await gotoMembers(page);

  await page.getByRole('button', { name: 'Add Member' }).click();
  const dialog = page.getByRole('dialog', { name: 'New Member' });
  await expect(dialog.getByText('Temporary password (optional)')).toBeVisible();
  await dialog.getByLabel('Name', { exact: true }).fill('New Person');
  await dialog.getByLabel('Email', { exact: true }).fill('new.person@example.com');
  await dialog.getByRole('button', { name: 'Create' }).click();

  await expect.poll(() => created.length).toBe(1);
  expect(created[0]).toMatchObject({ name: 'New Person', email: 'new.person@example.com' });
  expect(created[0]).not.toHaveProperty('password');
});

test('with password sign-in off, no password can be set for a member', async ({ page }) => {
  await mockMembersApi(page, { password: false });
  await gotoMembers(page);

  await page.getByRole('button', { name: 'Add Member' }).click();
  const dialog = page.getByRole('dialog', { name: 'New Member' });
  await expect(dialog.getByLabel('Name', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Temporary password (optional)')).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page
    .getByRole('row', { name: /Plain Member/ })
    .getByRole('button')
    .last()
    .click();
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Reset Password' })).toHaveCount(0);
});
