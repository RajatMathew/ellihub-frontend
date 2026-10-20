import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1438 — the Projects portfolio toolbar is a card holding only its
 * header. The themed header rounds its top for a table beneath it, so on its
 * own its square bottom showed against the card's rounded border.
 */

async function setupMockApi(page: Page) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-1', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'user-1', name: 'Test User', email: 'user@example.com' },
        },
      });
      return;
    }

    if (path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            userId: 'user-1',
            role: 'admin',
            isDev: false,
            isAdmin: true,
            permissions: { project: ['read', 'create'] },
          },
        },
      });
      return;
    }

    if (path === '/api/v1/project') {
      await route.fulfill({
        json: {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            totalItems: 0,
            itemsPerPage: 25,
          },
        },
      });
      return;
    }

    if (path === '/api/v1/project/stats') {
      await route.fulfill({
        json: {
          data: { totalProjects: 0, totalContractValue: 0, statusSummary: [], divisionSummary: [] },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('the Projects toolbar is rounded at the bottom as well as the top', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/app/projects');

  const header = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByPlaceholder('Search projects...') })
    .locator('[data-slot="card-header"]');
  await expect(header).toBeVisible();
  await expect(header).toContainText('0 projects');

  const radii = await header.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      top: parseFloat(style.borderTopLeftRadius),
      bottomLeft: parseFloat(style.borderBottomLeftRadius),
      bottomRight: parseFloat(style.borderBottomRightRadius),
    };
  });
  expect(radii.top).toBeGreaterThan(0);
  expect(radii.bottomLeft).toBe(radii.top);
  expect(radii.bottomRight).toBe(radii.top);
});
