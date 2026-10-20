import { expect, test, type Page } from '@playwright/test';

const PROJECT_ID = 'project-responsive-test';
const RFQ_ID = 'rfq-responsive-test';
const PO_ID = 'po-responsive-test';
const SCO_ID = 'sco-responsive-test';
const NOW = '2026-06-11T00:00:00.000Z';

const tradeCategory = {
  id: 'trade-structural',
  type: 'TRADE_CATEGORY',
  name: 'STRUCTURAL',
  label: 'Structural Steel',
  order: 1,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const unit = {
  id: 'unit-ea',
  type: 'UNIT',
  name: 'EA',
  label: 'EA',
  order: 1,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const projectDetail = {
  id: PROJECT_ID,
  name: 'Responsive Layout Project',
  jobNumber: 'P-RESP-001',
  status: 'ACTIVE',
  currentUserProjectRole: 'admin',
  capabilities: {
    canManage: true,
    canEdit: true,
    canCreateProjectDocuments: true,
    canManageTeam: true,
    actions: {
      purchaseOrder: { create: true, update: true },
      rfq: { create: true, update: true },
      subChangeOrder: { create: true, update: true },
      projectTeam: {},
      primeContract: {},
      invoice: {},
    },
  },
  createdAt: NOW,
  updatedAt: NOW,
};

const rfqDetail = {
  id: RFQ_ID,
  projectId: PROJECT_ID,
  rfqNumber: 'RFQ-001',
  title: 'Responsive Demolition RFQ',
  description: 'Demolition and hazmat abatement scope details.',
  status: { id: 'PUBLISHED', name: 'PUBLISHED', label: 'Published' },
  typeId: tradeCategory.id,
  type: tradeCategory,
  rfqDate: '2026-07-20T00:00:00.000Z',
  project: { id: PROJECT_ID, name: projectDetail.name, jobNumber: projectDetail.jobNumber },
  deliverables: [
    {
      id: 'rfq-deliverable-1',
      rfqId: RFQ_ID,
      sequenceNumber: 1,
      name: 'Beam takeoff',
      quantity: 10,
      unitId: unit.id,
      unit,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  invites: [
    {
      id: 'invite-1',
      sentAt: '2026-06-20T10:00:00.000Z',
      vendor: { id: 'vendor-1', name: '212 Renovations Group', email: 'bg@212renovations.com' },
    },
    {
      id: 'invite-2',
      sentAt: '2026-06-20T10:00:00.000Z',
      vendor: {
        id: 'vendor-2',
        name: '3 Brothers Masonry Concrete Corp',
        email: '3bros@example.com',
      },
    },
  ],
  quotes: [
    {
      id: 'quote-1',
      grandTotal: 123.0,
      leadTime: '5 days',
      vendor: { id: 'vendor-2', name: '3 Brothers Masonry Concrete Corp' },
    },
  ],
  attachments: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const poDetail = {
  id: PO_ID,
  poNumber: 'PO-001',
  projectId: PROJECT_ID,
  status: { id: 'ISSUED', name: 'ISSUED', label: 'Issued' },
  vendor: { id: 'vendor-1', name: '212 Renovations Group', email: 'bg@212renovations.com' },
  lineItems: [],
  attachments: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const scoDetail = {
  id: SCO_ID,
  scoNumber: 'SCO-001',
  projectId: PROJECT_ID,
  purchaseOrderId: PO_ID,
  purchaseOrder: { id: PO_ID, poNumber: 'PO-001', status: 'ISSUED', total: '0.00' },
  title: 'Responsive SCO',
  status: { id: 'DRAFT', name: 'DRAFT', label: 'Draft' },
  lineItems: [],
  createdAt: NOW,
  updatedAt: NOW,
};

async function setupMockApi(page: Page) {
  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-admin', expiresAt: '2026-12-31T00:00:00.000Z' },
          user: { id: 'user-admin', name: 'Admin User', email: 'admin@elli.com' },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            userId: 'user-admin',
            role: 'admin',
            isDev: false,
            isAdmin: true,
            permissions: {
              project: ['create', 'update', 'view-all'],
              rfq: ['create', 'update', 'view-all'],
              purchaseOrder: ['create', 'update', 'view-all'],
              subChangeOrder: ['create', 'update', 'view-all'],
            },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/project/${PROJECT_ID}`) {
      await route.fulfill({ json: { data: projectDetail } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/rfq/${RFQ_ID}`) {
      await route.fulfill({ json: { data: rfqDetail } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/purchase-order/${PO_ID}`) {
      await route.fulfill({ json: { data: poDetail } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/sub-change-order/${SCO_ID}`) {
      await route.fulfill({ json: { data: scoDetail } });
      return;
    }

    if (method === 'GET' && path.includes('/statuses')) {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (method === 'GET' && path.includes('/activity-log')) {
      await route.fulfill({ json: { data: [], pagination: { totalItems: 0 } } });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { message: `Unhandled test API route: ${method} ${path}` },
    });
  });
}

test.describe('Mobile Responsiveness and Scrollbars Check', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('verifies RFQ Detail page has no horizontal scroll and no double scrollbars', async ({
    page,
  }) => {
    await setupMockApi(page);
    await page.goto(`/app/project/${PROJECT_ID}/rfqs/${RFQ_ID}`);

    // Wait for content to render
    await expect(page.getByRole('heading', { name: 'Responsive Demolition RFQ' })).toBeVisible();

    // 1. Verify no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // 2. Verify window.scrollX remains 0
    const scrollX = await page.evaluate(() => window.scrollX);
    expect(scrollX).toBe(0);

    // 3. Verify body/html is not scrollable (no double scrollbars)
    const isHtmlScrollable = await page.evaluate(() => {
      const style = window.getComputedStyle(document.documentElement);
      return (
        style.overflow === 'auto' ||
        style.overflow === 'scroll' ||
        style.overflowY === 'auto' ||
        style.overflowY === 'scroll'
      );
    });
    // With overflow: hidden, html shouldn't be scrollable
    expect(isHtmlScrollable).toBe(false);
  });

  test('verifies Purchase Order Detail page has no horizontal scroll', async ({ page }) => {
    await setupMockApi(page);
    await page.goto(`/app/project/${PROJECT_ID}/purchase-orders/${PO_ID}`);

    // Wait for content to render
    await expect(page.getByText('PO Total')).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('verifies Sub Change Order Detail page has no horizontal scroll', async ({ page }) => {
    await setupMockApi(page);
    await page.goto(`/app/project/${PROJECT_ID}/sub-change-orders/${SCO_ID}`);

    // Wait for content to render
    await expect(page.getByRole('heading', { name: 'SCO-001' })).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });
});
