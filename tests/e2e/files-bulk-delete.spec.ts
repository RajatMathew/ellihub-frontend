import { expect, test, type Page, type Request, type Route } from '@playwright/test';

/**
 * Runtime coverage for bulk selection in the file explorer.
 *
 * Files is the one surface that renders its own table body rather than going
 * through `DataTable`, so the checkbox column reaching it at all is a claim
 * worth testing rather than assuming — as is the section header spanning the
 * right number of columns once that column exists.
 *
 * The rest is what Files does that no other list does: it navigates between
 * folders without changing a filter, it swaps to a card grid with no checkboxes
 * in it, and its rows can be ineligible for two different reasons.
 */

// These boot lazily-loaded routes against a cold dev server, which can take most
// of the default budget on its own when the suite runs in parallel. The waits
// below are for behaviour, not for compilation, so the timeout is raised rather
// than each assertion being loosened.
test.describe.configure({ timeout: 60_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;

const ROOT_ID = 'folder-root';
const CHILD_FOLDER_ID = 'folder-child';

interface BulkDeleteFailure {
  id: string;
  message: string;
  code: string;
}

const capabilities = {
  createFolder: true,
  delete: true,
  download: true,
  export: true,
  read: true,
  update: true,
  upload: true,
};

function makeFile(
  id: string,
  name: string,
  overrides: Partial<{
    isDeletable: boolean;
    isLinked: boolean;
    links: {
      linkKey: string;
      linkLabel: string;
      ownerId: string;
      ownerLabel: string;
      ownerDeleted: boolean;
    }[];
    type: 'FILE' | 'FOLDER';
  }> = {}
) {
  return {
    capabilities,
    createdAt: NOW,
    displayName: name,
    id,
    isDeletable: true,
    isLinked: false,
    mimeType: overrides.type === 'FOLDER' ? null : 'application/pdf',
    name,
    parentId: ROOT_ID,
    size: 1024,
    type: 'FILE' as const,
    updatedAt: NOW,
    ...overrides,
  };
}

/**
 * The root holds: a system folder that can never be deleted, a plain folder,
 * an ordinary file, and a file an RFQ is still holding.
 */
const ROOT_CHILDREN = [
  makeFile(CHILD_FOLDER_ID, 'Contracts', { type: 'FOLDER' }),
  makeFile('file-protected', 'Company Policy.pdf', { isDeletable: false }),
  makeFile('file-plain', 'Site Notes.pdf'),
  makeFile('file-linked', 'Quote.pdf', {
    isLinked: true,
    links: [
      {
        linkKey: 'rfq',
        linkLabel: 'RFQ',
        ownerDeleted: false,
        ownerId: 'rfq-1',
        ownerLabel: 'RFQ-0042',
      },
    ],
  }),
];

const CHILD_CHILDREN = [{ ...makeFile('file-inner', 'Inner.pdf'), parentId: CHILD_FOLDER_ID }];

interface MockOptions {
  bulkResult?: (ids: string[]) => { deletedIds: string[]; failed: BulkDeleteFailure[] };
}

async function mockFilesApi(page: Page, options: MockOptions = {}) {
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
            // The Files route itself is admin-gated; what may be deleted comes
            // from the folder's own capabilities below.
            isAdmin: true,
            isDev: false,
            permissions: { file: ['create', 'read', 'update', 'delete', 'export'] },
            projectScope: 'all',
            role: 'admin',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/file/root') {
      await route.fulfill({
        json: { data: makeFile(ROOT_ID, 'root', { type: 'FOLDER' }) },
      });
      return;
    }

    if (path === `/api/v1/file/folder/${CHILD_FOLDER_ID}`) {
      await route.fulfill({
        json: {
          data: {
            ...makeFile(CHILD_FOLDER_ID, 'Contracts', { type: 'FOLDER' }),
            breadcrumbs: [
              { id: ROOT_ID, name: 'root' },
              { id: CHILD_FOLDER_ID, name: 'Contracts' },
            ],
            children: CHILD_CHILDREN,
          },
        },
      });
      return;
    }

    if (path === `/api/v1/file/folder/${ROOT_ID}`) {
      await route.fulfill({
        json: {
          data: {
            ...makeFile(ROOT_ID, 'root', { type: 'FOLDER' }),
            breadcrumbs: [{ id: ROOT_ID, name: 'root' }],
            children: ROOT_CHILDREN,
          },
        },
      });
      return;
    }

    if (path === '/api/v1/file/bulk-delete') {
      const body = request.postDataJSON() as { ids: string[] };
      bulkRequests.push(body.ids);

      const outcome = options.bulkResult
        ? options.bulkResult(body.ids)
        : { deletedIds: body.ids, failed: [] as BulkDeleteFailure[] };

      await route.fulfill({ json: { data: { requested: body.ids.length, ...outcome } } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return { bulkRequests, latestBulk: () => bulkRequests[bulkRequests.length - 1] };
}

async function gotoFiles(page: Page, query = '') {
  await page.goto(`/app/files${query}`);
  await expect(page.getByRole('checkbox', { name: 'Select Site Notes.pdf' })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
}

function rowCheckbox(page: Page, name: string) {
  return page.getByRole('checkbox', { name: `Select ${name}` });
}

test.describe('files bulk selection', () => {
  test('the checkbox column reaches the explorer’s own table body', async ({ page }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    // Files renders its own <tbody>; these appearing at all is the claim.
    await expect(rowCheckbox(page, 'Site Notes.pdf')).toBeVisible();
    await expect(rowCheckbox(page, 'Contracts')).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: 'Select all rows on this page' })
    ).toBeVisible();
  });

  test('a section header still spans the full row once the column is injected', async ({
    page,
  }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    const headerCell = page.locator('td', { hasText: 'System Files' }).first();
    const columnCount = await page.locator('thead th').count();

    // The header used to span the caller's column array, which the injected
    // checkbox column is not in — one short leaves a gap in the row.
    await expect(headerCell).toHaveAttribute('colspan', String(columnCount));
  });

  test('neither a system item nor a file a record is holding can be checked', async ({ page }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    await expect(rowCheckbox(page, 'Company Policy.pdf')).toBeDisabled();
    await expect(rowCheckbox(page, 'Quote.pdf')).toBeDisabled();
    await expect(rowCheckbox(page, 'Site Notes.pdf')).toBeEnabled();
  });

  test('a blocked file names the record holding it', async ({ page }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    await expect(rowCheckbox(page, 'Quote.pdf')).toHaveAttribute('title', /RFQ-0042/);
  });

  test('select-all takes only the deletable rows', async ({ page }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();

    // Of four rows, the system one and the held one are not eligible.
    await expect(page.getByText('2 items selected')).toBeVisible();
  });

  test('the bulk bar replaces the explorer’s own filter row', async ({ page }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    await rowCheckbox(page, 'Site Notes.pdf').click();

    await expect(page.getByText('1 item selected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
  });

  test('navigating into a folder clears the selection', async ({ page }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    await rowCheckbox(page, 'Site Notes.pdf').click();
    await expect(page.getByText('1 item selected')).toBeVisible();

    await page.getByRole('cell', { exact: true, name: 'Contracts' }).click();

    // The folder is not a filter, so without naming it as selection scope the
    // checked row would follow the user in here.
    await expect(rowCheckbox(page, 'Inner.pdf')).toBeVisible({ timeout: ROUTE_TIMEOUT });
    await expect(page.getByText(/\d+ items? selected/)).toBeHidden();
  });

  test('switching to the card grid drops the selection', async ({ page }) => {
    await mockFilesApi(page);
    await gotoFiles(page);

    await rowCheckbox(page, 'Site Notes.pdf').click();
    await expect(page.getByText('1 item selected')).toBeVisible();

    // The bulk bar hides the view toggle, so switch the way a deep link would.
    await page.goto('/app/files?view=grid');

    // The grid has no checkboxes, so a surviving count would be unclearable.
    await expect(page.getByText(/\d+ items? selected/)).toBeHidden({ timeout: ROUTE_TIMEOUT });
  });
});

test.describe('files bulk delete', () => {
  test('sends the checked ids and closes on a clean run', async ({ page }) => {
    const api = await mockFilesApi(page);
    await gotoFiles(page);

    await rowCheckbox(page, 'Site Notes.pdf').click();
    await rowCheckbox(page, 'Contracts').click();

    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 2 items' }).click();

    // Sorted: the ids arrive in the order they were checked, and the ordering
    // that matters — files before folders — is the server's own.
    await expect
      .poll(() => api.latestBulk()?.slice().sort(), { timeout: ROUTE_TIMEOUT })
      .toEqual(['file-plain', CHILD_FOLDER_ID].sort());
    await expect(page.getByRole('alertdialog')).toBeHidden({ timeout: ROUTE_TIMEOUT });
  });

  test('a folder that still has items in it is reported, not emptied', async ({ page }) => {
    await mockFilesApi(page, {
      bulkResult: (ids) => ({
        deletedIds: ids.filter((id) => id !== CHILD_FOLDER_ID),
        failed: [
          {
            code: 'BadRequestError',
            id: CHILD_FOLDER_ID,
            message: 'Cannot delete a folder with items in it.',
          },
        ],
      }),
    });
    await gotoFiles(page);

    await rowCheckbox(page, 'Site Notes.pdf').click();
    await rowCheckbox(page, 'Contracts').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete 2 items' }).click();

    const dialog = page.getByRole('alertdialog');

    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 could not be deleted');
    await expect(dialog).toContainText('Contracts');
    await expect(dialog).toContainText('folder with items in it');

    // The file went; the folder stayed, and stayed checked.
    await expect(page.getByText('1 item selected')).toBeVisible();
  });
});
