import { expect, test, type Page } from '@playwright/test';

/**
 * Breadcrumb labels and detail back links both read the route tree. These
 * assertions are what stops a route rename from silently desyncing them.
 */
const VENDOR_ID = 'vendor-1';
const VENDOR = { id: VENDOR_ID, name: 'Millwood LLC', status: 'ACTIVE', taxId: '583920-XT' };

async function mock(page: Page) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 's1', userId: 'u1', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'u1', name: 'A', email: 'a@e.com' },
        },
      });
      return;
    }
    if (path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            userId: 'u1',
            role: 'admin',
            isDev: false,
            isAdmin: true,
            employeeId: 'e1',
            projectScope: 'all',
            permissions: { vendor: ['read', 'update', 'delete'], employee: ['read'] },
          },
        },
      });
      return;
    }
    if (path === `/api/v1/vendor/${VENDOR_ID}`) {
      await route.fulfill({ json: { data: VENDOR } });
      return;
    }
    await route.fulfill({ json: { data: [], pagination: { totalItems: 0, page: 1, limit: 10 } } });
  });
}

test.describe('route metadata', () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await mock(page);
  });

  test('breadcrumb labels come from the route tree', async ({ page }) => {
    await page.goto('/app/hr/employees');
    const crumbs = page.getByRole('navigation', { name: 'breadcrumb' });
    await expect(crumbs.getByRole('link', { name: 'HR' })).toBeVisible({ timeout: 60_000 });
    await expect(crumbs.getByText('Employees')).toBeVisible();
  });

  test('a route registered only for metadata still gets a crumb', async ({ page }) => {
    await page.goto('/app/settings/email-mailboxes');
    const crumbs = page.getByRole('navigation', { name: 'breadcrumb' });
    await expect(crumbs.getByRole('link', { name: 'Settings' })).toBeVisible({ timeout: 60_000 });
    await expect(crumbs.getByText('Common Inboxes')).toBeVisible();
  });

  test('the detail back link points at the list it names', async ({ page }) => {
    await page.goto(`/app/directory/vendors/${VENDOR_ID}`);
    await expect(page.getByRole('heading', { name: 'Millwood LLC' })).toBeVisible({
      timeout: 60_000,
    });

    // Two links say "Vendors" here — the breadcrumb and the header's back link.
    // Both are route-derived, so both must resolve to the vendor list. The back
    // link previously carried this label while resolving to /app/directory.
    const links = page.getByRole('main').getByRole('link', { name: 'Vendors', exact: true });
    await expect(links).toHaveCount(2);

    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('href', '/app/directory/vendors');
    }
  });
});
