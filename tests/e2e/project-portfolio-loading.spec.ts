import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Changing the portfolio's year shows a loader, not the previous year's projects.
 *
 * Both portfolio queries keep the last answer on screen while the next one
 * loads, so after picking another year the old year's projects stayed under the
 * new tab, with only a small "Refreshing" badge in a corner to say otherwise.
 * The board now shows its loading skeleton, as on first load, until the new
 * year arrives.
 */

test.describe.configure({ timeout: 90_000 });

const FIRST_LOAD_TIMEOUT = 60_000;

const projectNamed = (id: string, name: string, tcoDate: string) => ({
  id,
  name,
  jobNumber: id,
  description: 'Renovation',
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
  contractValue: 100000,
  totalSpent: 1000,
  budgetRemaining: 99000,
  spendUtilization: 1,
  tcoDate,
});

const page1 = (data: unknown[]) => ({
  data,
  pagination: {
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    itemsPerPage: 100,
    totalItems: data.length,
    totalPages: 1,
  },
});

async function mockApi(page: Page, releaseYear: Promise<void>) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

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
      if (url.searchParams.get('year') === '2027') {
        // Held until the test has looked at the loading state.
        await releaseYear;
        await route.fulfill({
          json: page1([
            projectNamed('P2027', 'Brooklyn Animal Care Center', '2027-06-30T00:00:00.000Z'),
          ]),
        });
        return;
      }
      await route.fulfill({
        json: page1([projectNamed('P2026', 'PS 082K', '2026-12-31T00:00:00.000Z')]),
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('picking another year shows the loader until that year arrives', async ({ page }) => {
  let release: () => void = () => {};
  const releaseYear = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mockApi(page, releaseYear);

  await page.goto('/app/projects');
  await expect(page.getByText('PS 082K')).toBeVisible({ timeout: FIRST_LOAD_TIMEOUT });

  await page.getByRole('button', { name: '2027', exact: true }).click();

  // The previous year's projects are gone while 2027 loads.
  await expect(page.getByRole('status', { name: 'Loading projects' })).toBeVisible();
  await expect(page.getByText('PS 082K')).toHaveCount(0);

  release();

  await expect(page.getByText('Brooklyn Animal Care Center')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading projects' })).toHaveCount(0);
});

test('switching between board and list shows no loader, nothing is fetched', async ({ page }) => {
  await mockApi(page, Promise.resolve());

  await page.goto('/app/projects');
  await expect(page.getByText('PS 082K')).toBeVisible({ timeout: FIRST_LOAD_TIMEOUT });

  await page.getByLabel('List view').click();

  await expect(page.getByText('PS 082K')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Loading projects' })).toHaveCount(0);
});
