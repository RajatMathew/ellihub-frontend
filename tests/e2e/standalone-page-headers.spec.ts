import { expect, test, type Page } from '@playwright/test';

/**
 * The four pages that were off the shared header entirely. Each asserts the
 * page's single h1 so a page reverting to its own markup — and its own title
 * scale — fails here rather than in review.
 */

async function mock(page: Page, permissions: Record<string, string[]>, email = 'admin@elli.com') {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 's1', userId: 'u1', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'u1', name: 'A', email },
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
            canAccessCheckingRegister: true,
            permissions,
          },
        },
      });
      return;
    }
    if (path === '/api/v1/integrations/quickbooks/status') {
      await route.fulfill({
        json: {
          data: {
            configured: true,
            missingConfig: [],
            environment: 'sandbox',
            redirectUri: null,
            apiBaseUrl: 'https://x',
            minorVersion: '70',
            connection: null,
          },
        },
      });
      return;
    }
    if (path === '/api/v1/users/me/profile') {
      await route.fulfill({
        json: {
          data: {
            user: {
              id: 'u1',
              name: 'A',
              email: 'a@e.com',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
            employee: null,
            signature: { name: 'A', role: 'Admin', email: 'a@e.com' },
            missingFields: [],
          },
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        data: [],
        counts: { active: 3, resolved: 0 },
        count: 0,
        connection: { companyName: 'Acme' },
        pagination: { totalItems: 0 },
      },
    });
  });
}

const H1 = 'h1';

test.describe('pages that build their own header content', () => {
  test.describe.configure({ timeout: 90_000 });

  test('checking register', async ({ page }) => {
    await mock(page, { quickBooksPaymentConflict: ['read'] });
    await page.goto('/app/finance/checking-register');
    await expect(page.locator(H1)).toHaveText('Checking Register', { timeout: 60_000 });
    await expect(
      page.getByText('Search QuickBooks bank accounts and review register transactions')
    ).toBeVisible();
  });

  test('payment conflicts', async ({ page }) => {
    await mock(page, { quickBooksPaymentConflict: ['read', 'sync', 'resolve'] });
    await page.goto('/app/finance/payment-conflicts');
    await expect(page.locator(H1)).toHaveText('QB Sync Conflicts', { timeout: 60_000 });
    await expect(page.getByText(/conflicts? needs? review/)).toBeVisible();
  });

  test('integrations', async ({ page }) => {
    await mock(page, { integration: ['read', 'sync', 'manage'] });
    await page.goto('/app/settings/integrations');
    await expect(page.locator(H1)).toHaveText('Integrations', { timeout: 60_000 });
  });

  test('shared mailboxes', async ({ page }) => {
    await mock(page, { user: ['manage-permissions'] });
    await page.goto('/app/settings/email-mailboxes');
    await expect(page.locator(H1)).toHaveText('Common inboxes', { timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Connect vendor account' })).toBeVisible();
  });

  test('project portfolio keeps its year tabs in the header', async ({ page }) => {
    await mock(page, { project: ['read', 'create'] });
    await page.goto('/app/projects');
    await expect(page.locator('h1')).toHaveText('Project Portfolio', { timeout: 60_000 });
    await expect(page.getByRole('link', { name: 'New Project' })).toBeVisible();
    const tabs = page.getByRole('navigation', { name: 'Project year filters' });
    await expect(tabs.getByRole('button', { name: 'ALL' })).toBeVisible();
  });

  test('profile', async ({ page }) => {
    await mock(page, {});
    await page.goto('/app/profile');
    await expect(page.locator('h1')).toHaveText('My Profile', { timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Save Profile' })).toBeVisible();
  });

  test('files', async ({ page }) => {
    await mock(page, { file: ['read', 'create'] });
    await page.goto('/app/files');
    await expect(page.locator('h1')).toHaveText('Files', { timeout: 60_000 });
  });
});
