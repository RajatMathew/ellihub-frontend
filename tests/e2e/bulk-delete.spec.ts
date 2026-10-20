import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * Runtime coverage for bulk selection and bulk delete.
 *
 * These assert the parts that are only true at runtime: that an ineligible row
 * cannot be checked, that a selection survives paging but not a filter change,
 * that the request carries exactly the checked ids, and — the one that matters
 * most — that a batch which came back partly done leaves the failures on screen
 * and still selected rather than reporting a success.
 *
 * Departments is the subject because it is the list with a real eligibility
 * rule: a department holding employees cannot be deleted.
 */

// These boot lazily-loaded routes against a cold dev server, which can take most
// of the default budget on its own when the suite runs in parallel. The waits
// below are for behaviour, not for compilation, so the timeout is raised rather
// than each assertion being loosened.
test.describe.configure({ timeout: 60_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;

interface BulkDeleteFailure {
  id: string;
  message: string;
  code: string;
}

function makeDepartment(index: number, employeeCount = 0) {
  return {
    createdAt: NOW,
    description: `Department ${index} description`,
    employeeCount,
    id: `dept-${index}`,
    name: `Department ${index}`,
    updatedAt: NOW,
  };
}

/** Two empty departments, then one holding an employee, which cannot be deleted. */
const PAGE_ONE = [makeDepartment(1), makeDepartment(2), makeDepartment(3, 4)];
const PAGE_TWO = [makeDepartment(4), makeDepartment(5)];

const pagination = {
  currentPage: 1,
  hasNextPage: true,
  hasPreviousPage: false,
  itemsPerPage: 10,
  // Larger than one page of the list's own size, or there is no Next to click.
  totalItems: 25,
  totalPages: 3,
};

interface MockOptions {
  /** Actions the signed-in user holds on `department`. */
  actions?: string[];
  /** Outcome the bulk endpoint returns. Defaults to deleting everything asked. */
  bulkResult?: (ids: string[]) => { deletedIds: string[]; failed: BulkDeleteFailure[] };
}

async function mockDepartmentsApi(page: Page, options: MockOptions = {}) {
  const { actions = ['create', 'read', 'update', 'delete'], bulkResult } = options;
  const bulkRequests: string[][] = [];

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
            // Not an admin: the permission list is what decides, and a blanket
            // admin flag would hide a missing gate rather than prove one.
            isAdmin: false,
            isDev: false,
            permissions: { department: actions },
            projectScope: 'all',
            role: 'member',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/hr/department/stats') {
      await route.fulfill({
        json: {
          data: {
            assignedEmployees: 4,
            emptyDepartments: 4,
            totalDepartments: 5,
            unassignedEmployees: 0,
          },
        },
      });
      return;
    }

    if (path === '/api/v1/hr/department/bulk-delete') {
      const body = request.postDataJSON() as { ids: string[] };
      bulkRequests.push(body.ids);

      const outcome = bulkResult
        ? bulkResult(body.ids)
        : { deletedIds: body.ids, failed: [] as BulkDeleteFailure[] };

      await route.fulfill({
        json: { data: { requested: body.ids.length, ...outcome } },
      });
      return;
    }

    if (path === '/api/v1/hr/department') {
      const isSecondPage = url.searchParams.get('page') === '2';

      await route.fulfill({
        json: {
          data: isSecondPage ? PAGE_TWO : PAGE_ONE,
          pagination: { ...pagination, currentPage: isSecondPage ? 2 : 1 },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return {
    bulkRequests,
    latestBulk: () => bulkRequests[bulkRequests.length - 1],
  };
}

async function gotoDepartments(page: Page, query = '') {
  await page.goto(`/app/hr/departments${query}`);
  await expect(page.getByRole('table', { name: 'Departments' })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
}

/** The checkbox for a department, addressed the way a screen reader would. */
function rowCheckbox(page: Page, name: string) {
  return page.getByRole('checkbox', { name: `Select ${name}` });
}

function bulkBarCount(page: Page) {
  return page.getByText(/\d+ departments? selected/);
}

test.describe('bulk selection', () => {
  test('renders a checkbox per row, named for that row', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await expect(rowCheckbox(page, 'Department 1')).toBeVisible();
    await expect(rowCheckbox(page, 'Department 2')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Select all rows on this page' })
    ).toBeVisible();
  });

  test('cannot check a department that still holds employees', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await expect(rowCheckbox(page, 'Department 3')).toBeDisabled();
    await expect(rowCheckbox(page, 'Department 1')).toBeEnabled();
  });

  test('select-all takes only the eligible rows on this page', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();

    // Two of the three rows are eligible; the third holds employees.
    await expect(page.getByText('2 departments selected')).toBeVisible();
  });

  test('the bulk bar replaces the filter controls while a selection is live', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await expect(page.getByPlaceholder('Search departments...')).toBeVisible();

    await rowCheckbox(page, 'Department 1').click();

    await expect(page.getByText('1 department selected')).toBeVisible();
    // Changing a filter now would silently drop the checked rows, so the control
    // that would do it is not on screen.
    await expect(page.getByPlaceholder('Search departments...')).toBeHidden();
  });

  test('Clear drops the selection and brings the filters back', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await rowCheckbox(page, 'Department 1').click();
    await expect(bulkBarCount(page)).toBeVisible();

    await page.getByRole('button', { name: 'Clear' }).click();

    await expect(bulkBarCount(page)).toBeHidden();
    await expect(page.getByPlaceholder('Search departments...')).toBeVisible();
  });

  test('selection survives paging', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await rowCheckbox(page, 'Department 1').click();
    await expect(page.getByText('1 department selected')).toBeVisible();

    await page.getByRole('button', { name: /next page/i }).click();
    await expect(rowCheckbox(page, 'Department 4')).toBeVisible();

    // Still one, carried from the page the user left.
    await expect(page.getByText('1 department selected')).toBeVisible();

    await rowCheckbox(page, 'Department 4').click();
    await expect(page.getByText('2 departments selected')).toBeVisible();
  });

  test('a filter change clears the selection', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await rowCheckbox(page, 'Department 1').click();
    await expect(bulkBarCount(page)).toBeVisible();

    // The bulk bar hides the search box, so drive the filter the way a deep link
    // would — the result set changes underneath the selection either way.
    await page.goto('/app/hr/departments?search=eng');

    await expect(bulkBarCount(page)).toBeHidden();
  });

  test('no delete permission means no checkbox column at all', async ({ page }) => {
    await mockDepartmentsApi(page, { actions: ['create', 'read', 'update'] });
    await gotoDepartments(page);

    await expect(page.getByRole('checkbox', { name: 'Select Department 1' })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Select all rows on this page' })).toHaveCount(
      0
    );
  });

  test('no delete permission also withholds the row action', async ({ page }) => {
    await mockDepartmentsApi(page, { actions: ['create', 'read', 'update'] });
    await gotoDepartments(page);

    await page.getByRole('button', { name: 'Actions for Department 1' }).click();

    // The bulk action and the row action answer to the same permission; offering
    // one and not the other only moves the rejection to a toast.
    await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Delete' })).toHaveCount(0);
  });

  test('with the permission the row action is offered', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await page.getByRole('button', { name: 'Actions for Department 1' }).click();

    await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  });
});

test.describe('bulk delete', () => {
  test('sends exactly the checked ids and reports the count', async ({ page }) => {
    const api = await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await rowCheckbox(page, 'Department 1').click();
    await rowCheckbox(page, 'Department 2').click();

    await page.getByRole('button', { name: 'Delete' }).click();

    // The dialog names what it is about to delete, not just how many.
    await expect(page.getByRole('alertdialog')).toContainText('Department 1');
    await expect(page.getByRole('alertdialog')).toContainText('Department 2');

    await page.getByRole('button', { name: 'Delete 2 departments' }).click();

    await expect
      .poll(() => api.latestBulk(), { timeout: ROUTE_TIMEOUT })
      .toEqual(['dept-1', 'dept-2']);
  });

  test('a clean run closes the dialog and clears the selection', async ({ page }) => {
    await mockDepartmentsApi(page);
    await gotoDepartments(page);

    await rowCheckbox(page, 'Department 1').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 1 department' }).click();

    await expect(page.getByRole('alertdialog')).toBeHidden({ timeout: ROUTE_TIMEOUT });
    await expect(bulkBarCount(page)).toBeHidden();
  });

  test('a partly-done batch keeps the failures selected and on screen', async ({ page }) => {
    await mockDepartmentsApi(page, {
      bulkResult: (ids) => ({
        deletedIds: ids.filter((id) => id !== 'dept-2'),
        failed: [
          {
            code: 'BadRequestError',
            id: 'dept-2',
            message: 'Cannot delete department while employees are assigned to it.',
          },
        ],
      }),
    });
    await gotoDepartments(page);

    await rowCheckbox(page, 'Department 1').click();
    await rowCheckbox(page, 'Department 2').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 2 departments' }).click();

    const dialog = page.getByRole('alertdialog');

    // The dialog stays open, names the record that was refused and repeats the
    // server's own reason — a count would say nothing actionable.
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 could not be deleted');
    await expect(dialog).toContainText('Department 2');
    await expect(dialog).toContainText('employees are assigned');

    // The one that succeeded has left the selection; the refused one has not.
    await expect(page.getByText('1 department selected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
});
