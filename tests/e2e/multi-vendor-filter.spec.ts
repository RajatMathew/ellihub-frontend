import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * Runtime coverage for the multi-value vendor filter on the purchase order list.
 *
 * The parts that are only true at runtime: that picking two vendors sends one
 * comma-separated `vendorId` rather than the last one clicked, that the
 * selection survives a reload from the URL alone, that a vendor with no row on
 * the current page still shows its name rather than its id — the defect the
 * old row-derived label had — and that Clear takes the param back out.
 */

// These boot lazily-loaded routes against a cold dev server, which can take most
// of the default budget on its own when the suite runs in parallel. The waits
// below are for behaviour, not for compilation, so the timeouts are raised
// rather than each assertion being loosened.
test.describe.configure({ timeout: 90_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;
/** The first paint of a lazily-compiled route, not a behavioural wait. */
const FIRST_LOAD_TIMEOUT = 60_000;
const PROJECT_ID = 'b2Bk3YzS';

// `status` is required by `vendorSchema`; without it the API client's
// `safeParse` throws and every label falls back to its raw id.
const VENDORS = [
  { email: 'hello@acme.test', id: 'aaaaaaaa', name: 'Acme Steel', status: 'ACTIVE' },
  { email: 'hello@borden.test', id: 'bbbbbbbb', name: 'Borden Glass', status: 'ACTIVE' },
  { email: 'hello@cortez.test', id: 'cccccccc', name: 'Cortez Tile', status: 'ACTIVE' },
];

function makePurchaseOrder(index: number, vendor: (typeof VENDORS)[number]) {
  return {
    createdAt: NOW,
    description: `Purchase order ${index}`,
    id: `po-${index}`,
    poNumber: `PO-100${index}`,
    projectId: PROJECT_ID,
    status: 'ISSUED',
    total: '1000.00',
    updatedAt: NOW,
    vendor,
    vendorId: vendor.id,
  };
}

interface Recorded {
  /** Every `vendorId` the PO list was asked for, in order. `null` when absent. */
  vendorIdParams: (string | null)[];
  /** Every `ids` the vendor list was asked to resolve labels for. */
  vendorIdsLookups: string[];
}

async function mockApi(page: Page): Promise<Recorded> {
  const recorded: Recorded = { vendorIdParams: [], vendorIdsLookups: [] };

  await page.route('**/api/v1/**', async (route: Route, request: Request) => {
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
            isAdmin: false,
            isDev: false,
            permissions: { project: ['read'], purchaseOrder: ['read'], vendor: ['read'] },
            projectScope: 'all',
            role: 'member',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/vendor') {
      const ids = url.searchParams.get('ids');

      // The label-resolution request: narrowed to an explicit set rather than
      // paging. Answering it from the full list is what the API does.
      if (ids) {
        recorded.vendorIdsLookups.push(ids);
        const wanted = new Set(ids.split(','));
        const data = VENDORS.filter((vendor) => wanted.has(vendor.id));

        await route.fulfill({
          json: {
            data,
            pagination: {
              currentPage: 1,
              hasNextPage: false,
              hasPreviousPage: false,
              itemsPerPage: data.length,
              totalItems: data.length,
              totalPages: 1,
            },
          },
        });
        return;
      }

      await route.fulfill({
        json: {
          data: VENDORS,
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            itemsPerPage: 25,
            totalItems: VENDORS.length,
            totalPages: 1,
          },
        },
      });
      return;
    }

    if (path === '/api/v1/purchase-order') {
      recorded.vendorIdParams.push(url.searchParams.get('vendorId'));

      // Only Acme owns a row. Borden deliberately owns none, so a badge reading
      // "Borden Glass" can only have come from the vendor endpoint.
      await route.fulfill({
        json: {
          data: [makePurchaseOrder(1, VENDORS[0]!)],
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            itemsPerPage: 25,
            totalItems: 1,
            totalPages: 1,
          },
        },
      });
      return;
    }

    if (path.startsWith('/api/v1/purchase-order/project/')) {
      await route.fulfill({ json: { data: {} } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return recorded;
}

async function gotoPurchaseOrders(page: Page, query = '') {
  await page.goto(`/app/project/${PROJECT_ID}/purchase-orders${query}`);
  await expect(page.getByRole('table', { name: 'Purchase orders' })).toBeVisible({
    timeout: FIRST_LOAD_TIMEOUT,
  });
}

/**
 * The vendor picker's trigger.
 *
 * Addressed by position rather than by its text, because its text is the thing
 * under test — a trigger reading the wrong thing must fail the assertion, not
 * fail to be found. It is the last combobox in the header row: search, trades,
 * then vendors.
 */
function vendorTrigger(page: Page) {
  return page.getByRole('combobox').nth(1);
}

async function openVendorPicker(page: Page) {
  // Clicked near the chevron rather than at the trigger's centre. Once a vendor
  // is selected its badge fills the middle of the trigger, and the badge carries
  // its own remove button — a centre click lands on that and deselects instead
  // of opening. A person aims at the chevron or the empty space beside it.
  const trigger = vendorTrigger(page);
  const box = await trigger.boundingBox();

  if (!box) throw new Error('vendor trigger has no layout');

  await trigger.click({ position: { x: box.width - 12, y: box.height / 2 } });
  await expect(page.getByPlaceholder('Search vendors...')).toBeVisible({ timeout: ROUTE_TIMEOUT });
}

test.describe('multi-vendor filter', () => {
  test('selects two vendors and sends them as one comma-separated param', async ({ page }) => {
    const recorded = await mockApi(page);
    await gotoPurchaseOrders(page);

    // Clicked back to back on purpose: the control must build the second
    // selection on the first, not on the value it was rendered with.
    await openVendorPicker(page);
    await page.getByRole('option', { name: /Acme Steel/ }).click();
    await page.getByRole('option', { name: /Borden Glass/ }).click();
    await page.keyboard.press('Escape');

    await expect
      .poll(() => recorded.vendorIdParams.at(-1), { timeout: ROUTE_TIMEOUT })
      .toBe('aaaaaaaa,bbbbbbbb');
  });

  test('the selection is in the URL, so a filtered view can be linked', async ({ page }) => {
    await mockApi(page);
    await gotoPurchaseOrders(page);

    await openVendorPicker(page);
    await page.getByRole('option', { name: /Acme Steel/ }).click();
    await page.getByRole('option', { name: /Cortez Tile/ }).click();
    await page.keyboard.press('Escape');

    await expect
      .poll(() => new URL(page.url()).searchParams.get('vendorId'), { timeout: ROUTE_TIMEOUT })
      .toBe('aaaaaaaa,cccccccc');
  });

  test('a deep link restores both selections by name, not by id', async ({ page }) => {
    // Borden owns no row on this page. The old row-derived label would render
    // its raw id here; the badge naming it proves the ids were resolved against
    // the vendor endpoint instead.
    const recorded = await mockApi(page);
    await gotoPurchaseOrders(page, '?vendorId=aaaaaaaa,bbbbbbbb');

    await expect(vendorTrigger(page)).toContainText('Acme Steel', {
      timeout: FIRST_LOAD_TIMEOUT,
    });
    await expect(vendorTrigger(page)).toContainText('+1');
    expect(recorded.vendorIdsLookups.length).toBeGreaterThan(0);

    await openVendorPicker(page);
    await expect(page.getByRole('option', { name: /Borden Glass/ })).toBeVisible();
  });

  test('a repeated or empty entry in a hand-typed URL collapses to one canonical form', async ({
    page,
  }) => {
    const recorded = await mockApi(page);
    await gotoPurchaseOrders(page, '?vendorId=aaaaaaaa,,bbbbbbbb,aaaaaaaa');

    // Otherwise this is the same filter as `aaaaaaaa,bbbbbbbb` but a second
    // cache entry and a second round trip.
    await expect
      .poll(() => recorded.vendorIdParams.at(-1), { timeout: ROUTE_TIMEOUT })
      .toBe('aaaaaaaa,bbbbbbbb');
  });

  test('shows one chip naming the first vendor and counting the rest', async ({ page }) => {
    await mockApi(page);
    await gotoPurchaseOrders(page, '?vendorId=aaaaaaaa,bbbbbbbb,cccccccc');

    await expect(page.getByLabel('Active filters')).toContainText('Acme Steel +2', {
      timeout: ROUTE_TIMEOUT,
    });
  });

  test('clearing drops the param rather than sending an empty one', async ({ page }) => {
    const recorded = await mockApi(page);
    await gotoPurchaseOrders(page, '?vendorId=aaaaaaaa,bbbbbbbb');

    await page.getByRole('button', { name: /clear/i }).first().click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get('vendorId'), { timeout: ROUTE_TIMEOUT })
      .toBeNull();
    // Polled, not read once: the URL changes before the refetch it triggers has
    // landed. "No filter", not "match nothing" — the param is absent, not empty.
    await expect.poll(() => recorded.vendorIdParams.at(-1), { timeout: ROUTE_TIMEOUT }).toBeNull();
  });

  test('deselecting the last vendor clears the filter', async ({ page }) => {
    const recorded = await mockApi(page);
    await gotoPurchaseOrders(page, '?vendorId=aaaaaaaa');

    await openVendorPicker(page);
    await page.getByRole('option', { name: /Acme Steel/ }).click();
    await page.keyboard.press('Escape');

    await expect.poll(() => recorded.vendorIdParams.at(-1), { timeout: ROUTE_TIMEOUT }).toBeNull();
  });
});
