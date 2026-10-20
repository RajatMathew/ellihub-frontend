import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * Runtime coverage for bulk delete on the RFQ list.
 *
 * RFQ is the one list where the eligibility rule protects something outside the
 * app: an RFQ that has been published was emailed to vendors, and is voided
 * rather than deleted. So what is worth proving here is mostly what *cannot* be
 * selected, and that the two destructive actions stay apart.
 */

// These boot lazily-loaded routes against a cold dev server, which can take most
// of the default budget on its own when the suite runs in parallel. The waits
// below are for behaviour, not for compilation, so the timeout is raised rather
// than each assertion being loosened.
test.describe.configure({ timeout: 60_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;
const PROJECT_ID = 'project-1';

interface BulkDeleteFailure {
  id: string;
  message: string;
  code: string;
}

function makeRfq(id: string, rfqNumber: string, status: string) {
  return {
    _count: { invites: 0, quotes: 0 },
    createdAt: NOW,
    estimatedBudget: 1000,
    id,
    project: { id: PROJECT_ID, jobNumber: 'JOB-1', name: 'Test Project' },
    rfqDate: NOW,
    rfqNumber,
    status: { id: `status-${status}`, label: status, name: status },
    title: `Title for ${rfqNumber}`,
    track: 'MATERIAL',
  };
}

const RFQS = [
  makeRfq('rfq-draft-1', 'RFQ-0001', 'DRAFT'),
  makeRfq('rfq-draft-2', 'RFQ-0002', 'DRAFT'),
  makeRfq('rfq-published', 'RFQ-0003', 'PUBLISHED'),
  makeRfq('rfq-awarded', 'RFQ-0004', 'AWARDED'),
];

interface MockOptions {
  /** Project-scoped RFQ actions. Delete is granted per project, not globally. */
  rfqActions?: Record<string, boolean>;
  bulkResult?: (ids: string[]) => { deletedIds: string[]; failed: BulkDeleteFailure[] };
}

async function mockRfqApi(page: Page, options: MockOptions = {}) {
  const {
    rfqActions = { award: true, create: true, delete: true, read: true, update: true, void: true },
    bulkResult,
  } = options;
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
            isAdmin: true,
            isDev: false,
            permissions: { project: ['view-all'], rfq: ['create', 'read', 'update', 'delete'] },
            projectScope: 'all',
            role: 'admin',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === `/api/v1/project/${PROJECT_ID}`) {
      await route.fulfill({
        json: {
          data: {
            capabilities: { actions: { rfq: rfqActions } },
            // description, stageId and gcId are required by the detail schema:
            // omit one and the parse throws, the query errors, and the
            // capability reads as absent rather than as denied.
            description: 'Test project',
            gcId: 'gc-1',
            id: PROJECT_ID,
            name: 'Test Project',
            projectScheduleEntries: [],
            stageId: 'stage-1',
            teamMembers: [],
          },
        },
      });
      return;
    }

    if (path === '/api/v1/rfq/bulk-delete') {
      const body = request.postDataJSON() as { ids: string[] };
      bulkRequests.push(body.ids);

      const outcome = bulkResult
        ? bulkResult(body.ids)
        : { deletedIds: body.ids, failed: [] as BulkDeleteFailure[] };

      await route.fulfill({ json: { data: { requested: body.ids.length, ...outcome } } });
      return;
    }

    if (path === '/api/v1/rfq') {
      await route.fulfill({
        json: {
          data: RFQS,
          pagination: {
            currentPage: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            itemsPerPage: 10,
            totalItems: RFQS.length,
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

async function gotoRfqs(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/rfqs`);
  await expect(page.getByRole('table', { name: 'RFQs' })).toBeVisible({ timeout: ROUTE_TIMEOUT });
}

function rowCheckbox(page: Page, rfqNumber: string) {
  return page.getByRole('checkbox', { name: `Select ${rfqNumber}` });
}

test.describe('rfq bulk selection', () => {
  test('only draft RFQs can be checked', async ({ page }) => {
    await mockRfqApi(page);
    await gotoRfqs(page);

    await expect(rowCheckbox(page, 'RFQ-0001')).toBeEnabled();
    await expect(rowCheckbox(page, 'RFQ-0002')).toBeEnabled();

    // Published and awarded RFQs have been sent to vendors. Deleting one is
    // refused by the API, so it must not be checkable either.
    await expect(rowCheckbox(page, 'RFQ-0003')).toBeDisabled();
    await expect(rowCheckbox(page, 'RFQ-0004')).toBeDisabled();
  });

  test('an issued RFQ says to void it instead', async ({ page }) => {
    await mockRfqApi(page);
    await gotoRfqs(page);

    await expect(rowCheckbox(page, 'RFQ-0003')).toHaveAttribute('title', /[Vv]oid/);
  });

  test('select-all takes the drafts and nothing else', async ({ page }) => {
    await mockRfqApi(page);
    await gotoRfqs(page);

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();

    await expect(page.getByText('2 RFQs selected')).toBeVisible();
  });

  test('without the project’s delete action there is no checkbox column', async ({ page }) => {
    await mockRfqApi(page, {
      rfqActions: {
        award: true,
        create: true,
        delete: false,
        read: true,
        update: true,
        void: true,
      },
    });
    await gotoRfqs(page);

    await expect(page.getByRole('checkbox', { name: 'Select RFQ-0001' })).toHaveCount(0);
  });
});

test.describe('rfq bulk delete', () => {
  test('sends only the checked drafts', async ({ page }) => {
    const api = await mockRfqApi(page);
    await gotoRfqs(page);

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();

    // The dialog names the RFQs by number, which is what the user recognises.
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('RFQ-0001');
    await expect(dialog).toContainText('RFQ-0002');
    await expect(dialog).not.toContainText('RFQ-0003');

    await page.getByRole('button', { name: 'Delete 2 RFQs' }).click();

    await expect
      .poll(() => api.latestBulk()?.slice().sort(), { timeout: ROUTE_TIMEOUT })
      .toEqual(['rfq-draft-1', 'rfq-draft-2']);
  });

  test('an RFQ published between load and confirm is reported, not silently skipped', async ({
    page,
  }) => {
    await mockRfqApi(page, {
      bulkResult: (ids) => ({
        deletedIds: ids.filter((id) => id !== 'rfq-draft-2'),
        failed: [
          {
            code: 'BadRequestError',
            id: 'rfq-draft-2',
            message: 'Only draft RFQs can be deleted',
          },
        ],
      }),
    });
    await gotoRfqs(page);

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 2 RFQs' }).click();

    const dialog = page.getByRole('alertdialog');

    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 could not be deleted');
    await expect(dialog).toContainText('RFQ-0002');
    await expect(dialog).toContainText('Only draft RFQs can be deleted');

    await expect(page.getByText('1 RFQ selected')).toBeVisible();
  });
});
