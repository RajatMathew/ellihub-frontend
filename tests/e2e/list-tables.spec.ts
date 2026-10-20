import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * Runtime coverage for the shared data-table kit.
 *
 * These assert the behaviour the kit exists to guarantee: that the URL and the
 * request agree, that a default is omitted rather than written, that clearing
 * removes every filter key, and that a deep link restores the view. The vendors
 * list is the subject because it exercises tabs, search, a select and the
 * limit/size rename in one page.
 */

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;

const vendorType = {
  createdAt: NOW,
  id: 'vendor-type-material',
  isActive: true,
  isDefault: false,
  label: 'Material Supplier',
  name: 'MATERIAL',
  order: 1,
  type: 'VENDOR_TYPE',
  updatedAt: NOW,
};

function makeVendor(index: number) {
  return {
    createdAt: NOW,
    currentBalance: 0,
    email: `vendor${index}@example.com`,
    id: `vendor-${index}`,
    name: `Vendor ${index}`,
    status: 'ACTIVE',
    totalCommitted: 0,
    totalPaid: 0,
    typeId: vendorType.id,
    updatedAt: NOW,
  };
}

const pagination = {
  currentPage: 1,
  hasNextPage: true,
  hasPreviousPage: false,
  itemsPerPage: 10,
  totalItems: 42,
  totalPages: 5,
};

/** Records the query string of every vendor list request the page makes. */
async function mockVendorsApi(page: Page) {
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
            permissions: { vendor: ['create', 'read', 'update', 'delete'] },
            projectScope: 'all',
            role: 'admin',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/lookup/type/VENDOR_TYPE') {
      await route.fulfill({ json: { data: [vendorType] } });
      return;
    }

    if (path === '/api/v1/vendor/stats') {
      await route.fulfill({
        json: {
          data: { outstandingBalance: 0, totalCommitted: 0, totalPaid: 0, totalVendors: 42 },
        },
      });
      return;
    }

    if (path === '/api/v1/vendor') {
      requests.push(url.searchParams);
      await route.fulfill({
        json: { data: [makeVendor(1), makeVendor(2)], pagination },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return {
    /** The query of the most recent list request. */
    latest: () => requests[requests.length - 1],
    /** Waits until a list request satisfying `predicate` has been made. */
    waitFor: async (predicate: (params: URLSearchParams) => boolean) => {
      await expect.poll(() => requests.some(predicate), { timeout: ROUTE_TIMEOUT }).toBe(true);
    },
  };
}

async function gotoVendors(page: Page, query = '') {
  await page.goto(`/app/directory/vendors${query}`);
  await expect(page.getByRole('table', { name: 'Vendors' })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
}

test.describe('resource list tables', () => {
  test('sends the configured defaults on first load', async ({ page }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page);

    await api.waitFor((params) => params.get('sortBy') === 'name');

    const params = api.latest();
    expect(params.get('page')).toBe('1');
    expect(params.get('sortOrder')).toBe('asc');
    // The schema renames size to limit for this resource, and the API layer then
    // renames it back to size on the wire, which is what the server reads. Asserting
    // the wire name keeps the whole chain honest rather than just the schema half.
    expect(params.get('size')).toBe('10');
    expect(params.get('limit')).toBeNull();
  });

  test('gives the table an accessible name', async ({ page }) => {
    await mockVendorsApi(page);
    await gotoVendors(page);

    await expect(page.getByRole('table', { name: 'Vendors' })).toBeVisible();
  });

  test('commits a debounced search to both the URL and the request', async ({ page }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page);

    await page.getByPlaceholder('Search vendors...').fill('acme');

    await api.waitFor((params) => params.get('search') === 'acme');
    await expect(page).toHaveURL(/search=acme/);
    // Searching returns to the first page.
    expect(api.latest().get('page')).toBe('1');
  });

  test('the search box clears with its button or Escape, keeping other filters', async ({
    page,
  }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page, '?search=acme&status=ACTIVE');
    const search = page.getByRole('searchbox', { name: 'Search vendors' });
    await expect(search).toHaveValue('acme');

    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
    await expect(page).not.toHaveURL(/search=/);
    await expect(page).toHaveURL(/status=ACTIVE/);

    await search.fill('beta');
    await api.waitFor((params) => params.get('search') === 'beta');
    await search.press('Escape');
    await expect(search).toHaveValue('');
    await expect(page).not.toHaveURL(/search=/);
  });

  test('keeps a typed space while the search reaches the URL', async ({ page }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page);
    const search = page.getByRole('searchbox', { name: 'Search vendors' });

    await search.pressSequentially('acme ');
    await api.waitFor((params) => params.get('search') === 'acme');
    await search.pressSequentially('supply');

    await expect(search).toHaveValue('acme supply');
    await api.waitFor((params) => params.get('search') === 'acme supply');
  });

  test('restores a deep-linked filter into the controls', async ({ page }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page, '?search=acme');

    await expect(page.getByPlaceholder('Search vendors...')).toHaveValue('acme');
    await api.waitFor((params) => params.get('search') === 'acme');
  });

  test('omits a sort that matches the list default, and writes one that does not', async ({
    page,
  }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page, '?sortBy=createdAt&sortOrder=desc');

    await api.waitFor((params) => params.get('sortBy') === 'createdAt');

    // Sorting back to the configured default drops the params rather than
    // writing a value that would read back as the default anyway.
    await page.getByRole('button', { name: /Vendor Name/i }).click();

    await expect(page).not.toHaveURL(/sortBy=name/);
    await api.waitFor((params) => params.get('sortBy') === 'name');
  });

  test('clearing removes every filter key from the URL', async ({ page }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page, '?search=acme&status=ACTIVE');

    await api.waitFor((params) => params.get('search') === 'acme');

    await page.getByRole('button', { name: 'Clear', exact: true }).click();

    await expect(page).not.toHaveURL(/search=/);
    await expect(page).not.toHaveURL(/status=/);
    await expect(page.getByPlaceholder('Search vendors...')).toHaveValue('');
  });

  test('paginates through the URL', async ({ page }) => {
    const api = await mockVendorsApi(page);
    await gotoVendors(page);

    await api.waitFor((params) => params.get('page') === '1');

    await page.getByRole('button', { name: /next page/i }).click();

    await api.waitFor((params) => params.get('page') === '2');
    await expect(page).toHaveURL(/page=2/);
  });
});
