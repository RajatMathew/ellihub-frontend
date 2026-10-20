import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * One press of Back undoes one step in Files.
 *
 * Opening a folder also clears the search box, and clearing it scheduled a
 * debounced write of the (already empty) search to the URL. That write pushed
 * the same URL a second time, so the browser held two entries for the folder
 * and Back appeared to do nothing the first time.
 */

test.describe.configure({ timeout: 60_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;
const ROOT_ID = 'folder-root';
const TEMP_ID = 'folder-temp';
// Longer than the search box's debounce, so any write it schedules has landed.
const PAST_SEARCH_DEBOUNCE_MS = 800;

const capabilities = {
  createFolder: true,
  delete: true,
  download: true,
  export: true,
  read: true,
  update: true,
  upload: true,
};

const entry = (id: string, name: string, parentId: string | null, type: 'FILE' | 'FOLDER') => ({
  capabilities,
  createdAt: NOW,
  displayName: name,
  id,
  isDeletable: true,
  isLinked: false,
  mimeType: type === 'FILE' ? 'application/pdf' : null,
  name,
  parentId,
  size: 1024,
  type,
  updatedAt: NOW,
});

async function mockFilesApi(page: Page) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;

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
      await route.fulfill({ json: { data: entry(ROOT_ID, 'root', null, 'FOLDER') } });
      return;
    }

    if (path === `/api/v1/file/folder/${ROOT_ID}`) {
      await route.fulfill({
        json: {
          data: {
            ...entry(ROOT_ID, 'root', null, 'FOLDER'),
            breadcrumbs: [{ id: ROOT_ID, name: 'root' }],
            children: [entry(TEMP_ID, 'Temp', ROOT_ID, 'FOLDER')],
          },
        },
      });
      return;
    }

    if (path === `/api/v1/file/folder/${TEMP_ID}`) {
      await route.fulfill({
        json: {
          data: {
            ...entry(TEMP_ID, 'Temp', ROOT_ID, 'FOLDER'),
            breadcrumbs: [
              { id: ROOT_ID, name: 'root' },
              { id: TEMP_ID, name: 'Temp' },
            ],
            children: [entry('file-notes', 'Site Notes.pdf', TEMP_ID, 'FILE')],
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

// In list view a folder opens by clicking its row.
const tempRow = (page: Page) => page.getByRole('cell', { name: 'Temp', exact: true });

async function openTemp(page: Page) {
  await page.goto('/app/files');
  await tempRow(page).click({ timeout: ROUTE_TIMEOUT });
  await expect(page).toHaveURL(new RegExp(`folderId=${TEMP_ID}`));
  await expect(page.getByRole('cell', { name: 'Site Notes.pdf', exact: true })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
  await page.waitForTimeout(PAST_SEARCH_DEBOUNCE_MS);
}

test.describe('Back in Files', () => {
  test('returns from a folder to where it was opened, in one press', async ({ page }) => {
    await mockFilesApi(page);
    await openTemp(page);

    await page.goBack();

    await expect(page).not.toHaveURL(/folderId=/);
    await expect(tempRow(page)).toBeVisible({ timeout: ROUTE_TIMEOUT });
  });

  test('adds one history entry per folder opened', async ({ page }) => {
    await mockFilesApi(page);
    await page.goto('/app/files');
    await expect(tempRow(page)).toBeVisible({ timeout: ROUTE_TIMEOUT });
    const before = await page.evaluate(() => history.length);

    await tempRow(page).click();
    await expect(page).toHaveURL(new RegExp(`folderId=${TEMP_ID}`));
    await page.waitForTimeout(PAST_SEARCH_DEBOUNCE_MS);

    expect(await page.evaluate(() => history.length)).toBe(before + 1);
  });
});
