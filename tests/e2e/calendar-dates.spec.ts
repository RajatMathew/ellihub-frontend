import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * A calendar date reads the same day for every viewer.
 *
 * The API sends a TCO of Jan 1, 2027 as `2027-01-01T00:00:00.000Z`. The
 * portfolio converted it to the viewer's clock, so in New York — where the
 * users are — the card read "TCO: Dec 31, 2026" while the same project read
 * "Jan 01, 2027" in India, and on its own edit form. Run in both zones.
 */

test.describe.configure({ timeout: 90_000 });

const FIRST_LOAD_TIMEOUT = 60_000;

const project = {
  id: 'Proj0001',
  name: 'PS 082K',
  jobNumber: '30000',
  description: 'Interior renovation',
  stageId: 'stage-fabrication',
  stage: {
    id: 'stage-fabrication',
    type: 'PROJECT_STAGE',
    name: 'FABRICATION',
    label: 'Fabrication',
  },
  divisionId: 'division-sca',
  division: { id: 'division-sca', type: 'PROJECT_DIVISION', name: 'SCA', label: 'SCA' },
  status: 'ACTIVE',
  contractValue: 261000,
  totalSpent: 64990.75,
  budgetRemaining: 196009.25,
  spendUtilization: 25,
  tcoDate: '2027-01-01T00:00:00.000Z',
  estimatedEndDate: null,
  gc: { id: 'gc-1', name: 'Technico Construction' },
  leadPM: { id: 'pm-1', name: 'Mahavir S.' },
};

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { expiresAt: '2027-12-31T00:00:00Z', id: 'session-1', userId: 'user-admin' },
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
            permissions: { project: ['read', 'view-all'] },
            projectScope: 'all',
            role: 'admin',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/project') {
      await route.fulfill({
        json: {
          data: [project],
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            itemsPerPage: 100,
            totalItems: 1,
            totalPages: 1,
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

for (const timezoneId of ['America/New_York', 'Asia/Kolkata']) {
  test.describe(`a viewer in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test('sees the TCO on the day it was set, on the board and in the list', async ({ page }) => {
      await mockApi(page);
      await page.goto('/app/projects');

      await expect(page.getByText('TCO: Jan 01, 2027')).toBeVisible({
        timeout: FIRST_LOAD_TIMEOUT,
      });
      await expect(page.getByText('Dec 31, 2026')).toHaveCount(0);

      await page.getByLabel('List view').click();
      await expect(page.getByText('Jan 01, 2027').first()).toBeVisible();
      await expect(page.getByText('Dec 31, 2026')).toHaveCount(0);
    });
  });
}
