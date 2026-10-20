import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * Employees is the only selection-enabled list that swaps the table for cards
 * below its breakpoint, so it is the only one where the checkbox column can
 * disappear with the table. These assert that selection survives that swap, and
 * that the card renders the same checkbox the column does rather than a second
 * one that could drift from it.
 */

// These boot lazily-loaded routes against a cold dev server, which can take most
// of the default budget on its own when the suite runs in parallel. The waits
// below are for behaviour, not for compilation, so the timeout is raised rather
// than each assertion being loosened.
test.describe.configure({ timeout: 60_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;

function makeEmployee(index: number) {
  return {
    createdAt: NOW,
    department: { id: 'dept-1', name: 'Engineering' },
    email: `employee${index}@example.com`,
    id: `employee-${index}`,
    name: `Employee ${index}`,
    phoneNumber: '+1 555 0100',
    startDate: NOW,
    status: 'ACTIVE',
    updatedAt: NOW,
  };
}

const EMPLOYEES = [makeEmployee(1), makeEmployee(2), makeEmployee(3)];

async function mockEmployeesApi(page: Page, actions = ['create', 'read', 'update', 'delete']) {
  const bulkRequests: string[][] = [];

  await page.route('**/api/v1/**', async (route: Route, request: Request) => {
    const path = new URL(request.url()).pathname;

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
            permissions: { employee: actions },
            projectScope: 'all',
            role: 'member',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/hr/employee/stats') {
      await route.fulfill({
        json: { data: { active: 3, inactive: 0, onLeave: 0, total: 3 } },
      });
      return;
    }

    if (path === '/api/v1/hr/employee/bulk-delete') {
      const body = request.postDataJSON() as { ids: string[] };
      bulkRequests.push(body.ids);
      await route.fulfill({
        json: { data: { deletedIds: body.ids, failed: [], requested: body.ids.length } },
      });
      return;
    }

    if (path === '/api/v1/hr/employee') {
      await route.fulfill({
        json: {
          data: EMPLOYEES,
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            itemsPerPage: 10,
            totalItems: EMPLOYEES.length,
            totalPages: 1,
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return { bulkRequests, latestBulk: () => bulkRequests[bulkRequests.length - 1] };
}

/** Below xl, where the list renders cards instead of the table. */
async function gotoEmployeesMobile(page: Page) {
  await page.setViewportSize({ height: 900, width: 640 });
  await page.goto('/app/hr/employees');
  await expect(page.getByRole('checkbox', { name: 'Select Employee 1' })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
}

test.describe('employees bulk selection on the card layout', () => {
  test('the table is gone at this width, and the checkbox is not', async ({ page }) => {
    await mockEmployeesApi(page);
    await gotoEmployeesMobile(page);

    // The table is what carries the checkbox column, and it is hidden here — so
    // a visible checkbox is proof the card is rendering the column's own cell.
    await expect(page.getByRole('table', { name: 'Employees' })).toBeHidden();
    await expect(page.getByRole('checkbox', { name: 'Select Employee 2' })).toBeVisible();
  });

  test('selecting from a card raises the bulk bar', async ({ page }) => {
    await mockEmployeesApi(page);
    await gotoEmployeesMobile(page);

    await page.getByRole('checkbox', { name: 'Select Employee 1' }).click();

    await expect(page.getByText('1 employee selected')).toBeVisible();
  });

  test('deletes the employees checked on the cards', async ({ page }) => {
    const api = await mockEmployeesApi(page);
    await gotoEmployeesMobile(page);

    await page.getByRole('checkbox', { name: 'Select Employee 1' }).click();
    await page.getByRole('checkbox', { name: 'Select Employee 3' }).click();

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 2 employees' }).click();

    await expect
      .poll(() => api.latestBulk()?.slice().sort(), { timeout: ROUTE_TIMEOUT })
      .toEqual(['employee-1', 'employee-3']);
  });

  test('no delete permission leaves the cards without checkboxes', async ({ page }) => {
    await mockEmployeesApi(page, ['create', 'read', 'update']);
    await page.setViewportSize({ height: 900, width: 640 });
    await page.goto('/app/hr/employees');

    // The card list still renders; only the checkbox is withheld. Addressed by
    // role because the hidden table keeps its own copy of the row in the DOM,
    // and only the visible one is in the accessibility tree.
    await expect(page.getByRole('link', { name: 'Employee 1' })).toBeVisible({
      timeout: ROUTE_TIMEOUT,
    });
    await expect(page.getByRole('checkbox', { name: 'Select Employee 1' })).toHaveCount(0);
  });
});
