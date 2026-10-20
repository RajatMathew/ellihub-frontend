import { expect, test, type Locator, type Page, type Request, type Route } from '@playwright/test';

/**
 * The vendor filter on the RFQ and sub change order lists, and the purchase
 * order filter on the SCO list — the same pickers the purchase order and
 * invoice lists carry (see multi-vendor-filter.spec.ts for the picker itself).
 *
 * What only a browser shows: that each list sends what was picked, that a
 * vendor far down the alphabet — chosen by search, so absent from the picker's
 * first page — is named on its chip rather than shown as an id, and that the
 * extra control fits the toolbar from a phone up.
 */

test.describe.configure({ timeout: 90_000 });

const ROUTE_TIMEOUT = 15_000;
/** The first paint of a lazily-compiled route, not a behavioural wait. */
const FIRST_LOAD_TIMEOUT = 60_000;
const PROJECT_ID = 'b2Bk3YzS';
const NOW = '2026-06-11T00:00:00.000Z';

const page1 = (data: unknown[]) => ({
  data,
  pagination: {
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    itemsPerPage: 25,
    totalItems: data.length,
    totalPages: 1,
  },
});

// The picker's first page. Zenith is not on it: it only arrives through the
// by-ids lookup, as a vendor chosen by search would.
const FIRST_PAGE_VENDORS = [
  { email: 'hello@acme.test', id: 'aaaaaaaa', name: 'Acme Steel', status: 'ACTIVE' },
  { email: 'hello@borden.test', id: 'bbbbbbbb', name: 'Borden Glass', status: 'ACTIVE' },
];
const ZENITH = {
  email: 'hello@zenith.test',
  id: 'zzzzzzzz',
  name: 'Zenith Roofing',
  status: 'ACTIVE',
};
const ALL_VENDORS = [...FIRST_PAGE_VENDORS, ZENITH];

const PURCHASE_ORDERS = [
  {
    createdAt: NOW,
    id: 'po000001',
    poNumber: 'PO-1001',
    projectId: PROJECT_ID,
    status: 'ISSUED',
    total: '1000.00',
    updatedAt: NOW,
    vendor: ALL_VENDORS[0],
    vendorId: 'aaaaaaaa',
  },
];

interface Recorded {
  rfq: URLSearchParams[];
  sco: URLSearchParams[];
}

async function mockApi(page: Page): Promise<Recorded> {
  const recorded: Recorded = { rfq: [], sco: [] };

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
            permissions: {
              project: ['read'],
              purchaseOrder: ['read'],
              rfq: ['read'],
              subChangeOrder: ['read'],
              vendor: ['read'],
            },
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
      const wanted = new Set(ids?.split(','));
      await route.fulfill({
        json: page1(ids ? ALL_VENDORS.filter((v) => wanted.has(v.id)) : FIRST_PAGE_VENDORS),
      });
      return;
    }

    if (path === '/api/v1/purchase-order') {
      await route.fulfill({ json: page1(PURCHASE_ORDERS) });
      return;
    }

    if (path === '/api/v1/rfq') {
      recorded.rfq.push(url.searchParams);
      await route.fulfill({ json: page1([]) });
      return;
    }

    if (path === '/api/v1/sub-change-order') {
      recorded.sco.push(url.searchParams);
      await route.fulfill({ json: page1([]) });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return recorded;
}

async function gotoList(page: Page, list: 'rfqs' | 'sub-change-order', query = '') {
  await page.goto(`/app/project/${PROJECT_ID}/${list}${query}`);
  // The search box, not the table: below desktop an empty list renders no table.
  const search = list === 'rfqs' ? 'Search RFQs...' : 'Search SCOs...';
  await expect(page.getByPlaceholder(search)).toBeVisible({ timeout: FIRST_LOAD_TIMEOUT });
}

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (!found) throw new Error('a control has no box');
  return found;
};

async function expectApart(controls: Locator[]) {
  const boxes = await Promise.all(controls.map(box));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i]!, boxes[j]!];
      const overlap =
        a.x < b.x + b.width - 1 &&
        b.x < a.x + a.width - 1 &&
        a.y < b.y + b.height - 1 &&
        b.y < a.y + a.height - 1;
      expect(overlap, `controls ${i} and ${j} overlap`).toBe(false);
    }
  }
}

test.describe('the RFQ list vendor filter', () => {
  test('sends the vendors from the URL', async ({ page }) => {
    const recorded = await mockApi(page);
    await gotoList(page, 'rfqs', '?vendorId=aaaaaaaa,zzzzzzzz');

    await expect
      .poll(() => recorded.rfq.at(-1)?.get('vendorId'), { timeout: ROUTE_TIMEOUT })
      .toBe('aaaaaaaa,zzzzzzzz');
  });

  test('names a vendor chosen by search on its chip, not its id', async ({ page }) => {
    await mockApi(page);
    await gotoList(page, 'rfqs', '?vendorId=zzzzzzzz');

    await expect(page.getByLabel('Active filters')).toContainText('Zenith Roofing', {
      timeout: ROUTE_TIMEOUT,
    });
  });

  test('picking a vendor filters by it', async ({ page }) => {
    const recorded = await mockApi(page);
    await gotoList(page, 'rfqs');

    await page.getByRole('combobox').filter({ hasText: 'All Vendors' }).click();
    await page.getByRole('option', { name: /Borden Glass/ }).click();
    await page.keyboard.press('Escape');

    await expect
      .poll(() => recorded.rfq.at(-1)?.get('vendorId'), { timeout: ROUTE_TIMEOUT })
      .toBe('bbbbbbbb');
  });
});

test.describe('the sub change order list filters', () => {
  test('sends the vendors and purchase orders from the URL', async ({ page }) => {
    const recorded = await mockApi(page);
    await gotoList(page, 'sub-change-order', '?vendorId=aaaaaaaa&purchaseOrderId=po000001');

    await expect
      .poll(() => recorded.sco.at(-1)?.toString(), { timeout: ROUTE_TIMEOUT })
      .toContain('vendorId=aaaaaaaa');
    expect(recorded.sco.at(-1)?.get('purchaseOrderId')).toBe('po000001');
    await expect(page.getByLabel('Active filters')).toContainText('PO-1001');
  });

  test('picking a purchase order filters by it', async ({ page }) => {
    const recorded = await mockApi(page);
    await gotoList(page, 'sub-change-order');

    await page.getByRole('combobox').filter({ hasText: 'All Purchase Orders' }).click();
    await page.getByRole('option', { name: /PO-1001/ }).click();
    await page.keyboard.press('Escape');

    await expect
      .poll(() => recorded.sco.at(-1)?.get('purchaseOrderId'), { timeout: ROUTE_TIMEOUT })
      .toBe('po000001');
  });
});

const VIEWPORTS = [
  { name: 'small phone', width: 320, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'small desktop', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  test(`the toolbars fit with the new pickers: ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockApi(page);

    // A selected vendor widens its trigger with a badge; the worst case.
    await gotoList(page, 'rfqs', '?vendorId=aaaaaaaa,bbbbbbbb');
    const rfqControls = [
      page.getByPlaceholder('Search RFQs...'),
      page.getByRole('combobox').filter({ hasText: 'Acme Steel' }),
      page.getByRole('combobox').filter({ hasText: 'All Statuses' }),
    ];
    for (const control of rfqControls) await expect(control).toBeVisible();
    await expectApart(rfqControls);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width
    );

    await gotoList(page, 'sub-change-order', '?vendorId=aaaaaaaa&purchaseOrderId=po000001');
    const scoControls = [
      page.getByPlaceholder('Search SCOs...'),
      page.getByRole('combobox').filter({ hasText: 'Acme Steel' }),
      page.getByRole('combobox').filter({ hasText: 'PO-1001' }),
      page.getByRole('combobox').filter({ hasText: 'All Change Types' }),
    ];
    for (const control of scoControls) await expect(control).toBeVisible();
    await expectApart(scoControls);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width
    );
  });
}
