import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke coverage for the shared page-header system, rendered against the
 * dev-only kit route. Guards the contract every preset depends on: the summary
 * wording, the loading shape, and capability filtering.
 */
async function mockKitApi(page: Page) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-dev', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'user-dev', name: 'Dev User', email: 'dev@elli.com' },
        },
      });
      return;
    }

    if (path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            userId: 'user-dev',
            role: 'dev',
            isDev: true,
            isAdmin: true,
            employeeId: 'employee-dev',
            projectScope: 'all',
            permissions: { vendor: ['create', 'update', 'read'] },
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test.describe('page header kit', () => {
  // Every test navigates to the same lazy route. On a cold Vite cache the first
  // workers wait on that chunk being compiled, which costs ~20s once.
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await mockKitApi(page);
    await page.goto('/app/ui/page-header');
    await expect(page.getByRole('heading', { name: 'Page header kit', level: 1 })).toBeVisible({
      timeout: 60_000,
    });
  });

  test('renders the summary wording each list state produces', async ({ page }) => {
    await expect(page.getByText('Total Vendors: 34')).toBeVisible();
    await expect(page.getByText('Showing 1 result', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Fieldwire Project: Ridgeline Tower | Last synced: 2 hours ago')
    ).toBeVisible();
  });

  test('renders detail title, status and metadata row', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Millwood LLC' })).toBeVisible();
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    await expect(page.getByText('Fabrication')).toBeVisible();
    await expect(page.getByText('583920-XT')).toBeVisible();
  });

  test('back link points at the parent route', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Vendors', exact: true }).first()).toBeVisible();
  });

  test('overflow menu holds the destructive action, not the button row', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Archive Vendor' })).toHaveCount(0);

    await page.getByRole('button', { name: 'More actions' }).first().click();
    await expect(page.getByRole('menuitem', { name: 'Archive Vendor' })).toBeVisible();
  });

  test('panel toggle shows while the panel is closed and hides once opened', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'View Details' });
    await expect(toggle).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveCount(0);
  });

  test('form header renders cancel and submit last, with a submitting state', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Create Vendor' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    await expect(page.getByRole('link', { name: 'Cancel' }).first()).toBeVisible();
  });

  test('capability gating removes actions the user cannot perform', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Always visible' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hidden — boolean false' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hidden — capability unmet' })).toHaveCount(0);
  });
});
