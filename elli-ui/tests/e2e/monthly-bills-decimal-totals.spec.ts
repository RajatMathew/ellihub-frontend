import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-06-15T00:00:00.000Z';
const DECIMAL_AMOUNT = '0.105';

const pagination = {
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  totalItems: 0,
  itemsPerPage: 25,
};

const monthlyBillGroups = [
  {
    project: {
      id: 'project-decimal-totals',
      name: 'Decimal Test Project',
      jobNumber: '99999-01',
    },
    bills: [makeMonthlyBill('po-decimal-1', 'DEC-001'), makeMonthlyBill('po-decimal-2', 'DEC-002')],
  },
];

function makeMonthlyBill(purchaseOrderId: string, poNumber: string) {
  return {
    purchaseOrder: {
      id: purchaseOrderId,
      poNumber,
      vendor: {
        id: 'vendor-decimal',
        name: 'Decimal Vendor',
      },
      issuedAt: NOW,
      subChangeOrders: [],
    },
    original: DECIMAL_AMOUNT,
    balance: DECIMAL_AMOUNT,
    totalPaid: DECIMAL_AMOUNT,
    plannedPayment: {
      amount: DECIMAL_AMOUNT,
      isReady: false,
    },
    payments: [
      {
        id: `payment-${purchaseOrderId}`,
        txnDate: NOW,
        amount: DECIMAL_AMOUNT,
        transactionId: null,
        transactionUrl: null,
      },
    ],
  };
}

async function mockMonthlyBillsApi(page: Page) {
  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-admin', expiresAt: '2026-12-31T00:00:00Z' },
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
            employeeId: 'employee-admin',
            projectScope: 'all',
            permissions: {
              monthlyBills: ['read', 'update', 'mark-payment'],
              vendor: ['read'],
            },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/TRADE_CATEGORY') {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/vendor') {
      await route.fulfill({ json: { data: [], pagination } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/monthly-bills') {
      await route.fulfill({ json: { data: monthlyBillGroups } });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { error: `Unhandled test API request: ${method} ${path}` },
    });
  });
}

test.describe('monthly bills decimal totals', () => {
  test('renders half-up rounded totals without floating point drift', async ({ page }) => {
    await mockMonthlyBillsApi(page);

    const monthlyBillsResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/v1/monthly-bills' && response.request().method() === 'GET';
    });

    await page.goto('/app/monthly-bills/subcontractor?month=06&year=2026');
    await monthlyBillsResponse;

    await expect(
      page.getByRole('heading', { name: '99999-01 Decimal Test Project' })
    ).toBeVisible();

    const totalsRow = page.getByRole('row').filter({ hasText: 'Totals' });
    await expect(totalsRow).toBeVisible();
    await expect(totalsRow.getByRole('cell').nth(2)).toHaveText('Totals');
    await expect(totalsRow.getByRole('cell').nth(3)).toHaveText('$0.22');
    await expect(totalsRow.getByRole('cell').nth(4)).toHaveText('$0.22');
    await expect(totalsRow.getByRole('cell').nth(5)).toHaveText('$0.22');
    await expect(totalsRow.getByRole('cell').nth(6)).toHaveText('$0.22');
    await expect(totalsRow.getByRole('cell').nth(7)).toHaveText('$0.22');
  });
});
