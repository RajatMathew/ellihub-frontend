import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * Runtime coverage for bulk removal on the members list.
 *
 * Members is the one list whose destructive action can lock the organization
 * out of itself, so the two guards are what matter here: an administrator
 * cannot delete their own account, and cannot delete the last remaining
 * administrator. Only the first is knowable in the browser — the second depends
 * on the whole organization rather than the page — so the second is asserted as
 * what the user is told when the server refuses it.
 */

// These boot lazily-loaded routes against a cold dev server, which can take most
// of the default budget on its own when the suite runs in parallel. The waits
// below are for behaviour, not for compilation, so the timeout is raised rather
// than each assertion being loosened.
test.describe.configure({ timeout: 60_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;
const CURRENT_USER_ID = 'user-me';

interface BulkDeleteFailure {
  id: string;
  message: string;
  code: string;
}

function makeMember(id: string, name: string, role: string) {
  return {
    banned: false,
    checkingRegisterAccess: false,
    createdAt: NOW,
    email: `${id}@example.com`,
    emailVerified: true,
    id,
    name,
    role,
    updatedAt: NOW,
  };
}

const MEMBERS = [
  makeMember(CURRENT_USER_ID, 'Current Admin', 'admin'),
  makeMember('user-other-admin', 'Other Admin', 'admin'),
  makeMember('user-member-1', 'Plain Member', 'user'),
  makeMember('user-member-2', 'Second Member', 'user'),
];

interface MockOptions {
  bulkResult?: (ids: string[]) => { deletedIds: string[]; failed: BulkDeleteFailure[] };
}

async function mockMembersApi(page: Page, options: MockOptions = {}) {
  const bulkRequests: string[][] = [];

  await page.route('**/api/v1/**', async (route: Route, request: Request) => {
    const path = new URL(request.url()).pathname;

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
            // The members route is gated on this action, not on the admin flag.
            permissions: { user: ['manage-permissions'] },
            projectScope: 'all',
            role: 'admin',
            userId: CURRENT_USER_ID,
          },
        },
      });
      return;
    }

    if (path === '/api/v1/users/bulk-delete') {
      const body = request.postDataJSON() as { ids: string[] };
      bulkRequests.push(body.ids);

      const outcome = options.bulkResult
        ? options.bulkResult(body.ids)
        : { deletedIds: body.ids, failed: [] as BulkDeleteFailure[] };

      await route.fulfill({ json: { data: { requested: body.ids.length, ...outcome } } });
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

  return { bulkRequests, latestBulk: () => bulkRequests[bulkRequests.length - 1] };
}

async function gotoMembers(page: Page) {
  await page.goto('/app/settings/members');
  await expect(page.getByRole('table', { name: 'Members' })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
}

function rowCheckbox(page: Page, name: string) {
  return page.getByRole('checkbox', { name: `Select ${name}` });
}

test.describe('members bulk selection', () => {
  test('an administrator cannot check their own account', async ({ page }) => {
    await mockMembersApi(page);
    await gotoMembers(page);

    await expect(rowCheckbox(page, 'Current Admin')).toBeDisabled();
    await expect(rowCheckbox(page, 'Other Admin')).toBeEnabled();
    await expect(rowCheckbox(page, 'Plain Member')).toBeEnabled();
  });

  test('the disabled checkbox says why', async ({ page }) => {
    await mockMembersApi(page);
    await gotoMembers(page);

    await expect(rowCheckbox(page, 'Current Admin')).toHaveAttribute(
      'title',
      /cannot delete your own account/i
    );
  });

  test('select-all leaves the caller out', async ({ page }) => {
    await mockMembersApi(page);
    await gotoMembers(page);

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();

    // Four members, minus the one doing the selecting.
    await expect(page.getByText('3 members selected')).toBeVisible();
  });

  test('sends only the checked members', async ({ page }) => {
    const api = await mockMembersApi(page);
    await gotoMembers(page);

    await rowCheckbox(page, 'Plain Member').click();
    await rowCheckbox(page, 'Second Member').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 2 members' }).click();

    await expect
      .poll(() => api.latestBulk()?.slice().sort(), { timeout: ROUTE_TIMEOUT })
      .toEqual(['user-member-1', 'user-member-2']);
  });
});

test.describe('members bulk delete guards', () => {
  test('the last administrator is refused, and the reason is shown', async ({ page }) => {
    await mockMembersApi(page, {
      bulkResult: (ids) => ({
        deletedIds: ids.filter((id) => id !== 'user-other-admin'),
        failed: [
          {
            code: 'BadRequestError',
            id: 'user-other-admin',
            message:
              'This is the last administrator. Give another member the admin role before deleting this one.',
          },
        ],
      }),
    });
    await gotoMembers(page);

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 3 members' }).click();

    const dialog = page.getByRole('alertdialog');

    // The organization keeps an admin, and the user is told which one and why —
    // the count alone would not say what to do about it.
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 could not be deleted');
    await expect(dialog).toContainText('Other Admin');
    await expect(dialog).toContainText('last administrator');

    await expect(page.getByText('1 member selected')).toBeVisible();
  });
});
