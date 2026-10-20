import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * Removing a range filter by its chip.
 *
 * A range owns two URL keys, and the chip's ✕ used to clear them one at a
 * time. Two URL writes in the same tick lose the first, so removing
 * "2026-09-08 – 2026-09-09" left "From 2026-09-08", and that chip could not
 * be removed at all. Every list with a range had it — Files, the Checking
 * Register, Activity Log, Prime Change Orders; Activity Log is the one driven
 * here, having the simplest API to stand in for.
 */

const ROUTE_TIMEOUT = 15_000;

const pagination = {
  currentPage: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  itemsPerPage: 25,
  totalItems: 0,
  totalPages: 1,
};

async function mockActivityLogApi(page: Page) {
  const requests: URLSearchParams[] = [];

  await page.route('**/api/v1/**', async (route, request: Request) => {
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { expiresAt: '2026-12-31T00:00:00Z', id: 'session-1', userId: 'user-admin' },
          user: { email: 'admin@elli.com', id: 'user-admin', name: 'Admin User' },
        },
      });
      return;
    }

    if (path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            employeeId: 'employee-admin',
            isAdmin: true,
            isDev: false,
            permissions: { activityLog: ['read'] },
            projectScope: 'all',
            role: 'admin',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/activity-log') {
      requests.push(url.searchParams);
      await route.fulfill({ json: { data: [], pagination } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return {
    latest: () => requests[requests.length - 1],
    waitFor: async (predicate: (params: URLSearchParams) => boolean) => {
      await expect.poll(() => requests.some(predicate), { timeout: ROUTE_TIMEOUT }).toBe(true);
    },
  };
}

const chipRemove = (page: Page) =>
  page.getByRole('button', { name: 'Remove Activity date filter' });

test.describe('a range filter chip', () => {
  test('removes both ends of the range in one click', async ({ page }) => {
    const api = await mockActivityLogApi(page);
    await page.goto('/app/activity-log?from=2026-09-08&to=2026-09-09');
    await api.waitFor((params) => params.get('from') === '2026-09-08');

    await expect(chipRemove(page)).toBeVisible({ timeout: ROUTE_TIMEOUT });
    await chipRemove(page).click();

    await expect(page).not.toHaveURL(/[?&]from=/);
    await expect(page).not.toHaveURL(/[?&]to=/);
    await expect(chipRemove(page)).toHaveCount(0);
    await api.waitFor((params) => !params.has('from') && !params.has('to'));
  });

  test('removes a range with only a start', async ({ page }) => {
    const api = await mockActivityLogApi(page);
    await page.goto('/app/activity-log?from=2026-09-08');
    await api.waitFor((params) => params.get('from') === '2026-09-08');

    await chipRemove(page).click();

    await expect(page).not.toHaveURL(/[?&]from=/);
    await expect(chipRemove(page)).toHaveCount(0);
  });
});
