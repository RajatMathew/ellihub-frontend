import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * Searching the project portfolio. The search used to appear only in list view,
 * so the board - the page's default - could not be searched at all.
 */

test.describe.configure({ timeout: 90_000 });

const FIRST_LOAD_TIMEOUT = 60_000;

const project = (id: string, name: string) => ({
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
  tcoDate: '2026-12-31T00:00:00.000Z',
});

const LANGONE = project('29500', 'NYU Langone Orthopedic Center');
const PRECINCT = project('20150', '116th Precinct St');

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

async function mockApi(page: Page) {
  const searches: (string | null)[] = [];

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
      const search = url.searchParams.get('search');
      searches.push(search);
      const matches = !search
        ? [LANGONE, PRECINCT]
        : [LANGONE, PRECINCT].filter((item) =>
            search
              .toLowerCase()
              .split(/\s+/)
              .every((word) => `${item.name} ${item.jobNumber}`.toLowerCase().includes(word))
          );
      await route.fulfill({ json: page1(matches) });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });

  return { lastSearch: () => searches[searches.length - 1] ?? null };
}

const searchBox = (page: Page) => page.getByRole('searchbox', { name: 'Search projects' });

test('the board view can be searched, by several words at once', async ({ page }) => {
  const api = await mockApi(page);
  await page.goto('/app/projects');
  await expect(page.getByText(PRECINCT.name)).toBeVisible({ timeout: FIRST_LOAD_TIMEOUT });

  await searchBox(page).fill('langone 29500');

  await expect(page).toHaveURL(/search=langone\+29500/);
  await expect.poll(api.lastSearch).toBe('langone 29500');
  await expect(page.getByText(LANGONE.name)).toBeVisible();
  await expect(page.getByText(PRECINCT.name)).toHaveCount(0);
});

test('a link with a search opens on its results', async ({ page }) => {
  await mockApi(page);
  await page.goto('/app/projects?search=precinct');

  await expect(searchBox(page)).toHaveValue('precinct', { timeout: FIRST_LOAD_TIMEOUT });
  await expect(page.getByText(PRECINCT.name)).toBeVisible();
  await expect(page.getByText(LANGONE.name)).toHaveCount(0);
});

test('a search that matches nothing says so, and clears from there', async ({ page }) => {
  await mockApi(page);
  await page.goto('/app/projects?search=nothing');

  await expect(page.getByText('No projects match “nothing”.')).toBeVisible({
    timeout: FIRST_LOAD_TIMEOUT,
  });
  await page.getByRole('button', { name: 'Clear search', exact: true }).last().click();

  await expect(page).not.toHaveURL(/search=/);
  await expect(searchBox(page)).toHaveValue('');
  await expect(page.getByText(PRECINCT.name)).toBeVisible();
});

test('/ jumps into the search, and Escape empties it', async ({ page }) => {
  await mockApi(page);
  await page.goto('/app/projects?search=langone');
  await expect(page.getByText(LANGONE.name)).toBeVisible({ timeout: FIRST_LOAD_TIMEOUT });

  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('/');
  await expect(searchBox(page)).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(searchBox(page)).toHaveValue('');
  await expect(page).not.toHaveURL(/search=/);
  await expect(page.getByText(PRECINCT.name)).toBeVisible();
});
