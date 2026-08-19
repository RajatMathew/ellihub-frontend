import { expect, test, type Page } from '@playwright/test';

/**
 * Double clicking Upload used to queue the file twice: the dialog hands the
 * file to the background upload tray and its owner closes it, so there is no
 * pending state to disable the button with, and the dialog stays mounted and
 * clickable for the length of its close animation.
 */

const NOW = '2026-08-18T00:00:00.000Z';
const ROOT_ID = 'root-folder';

const capabilities = {
  read: true,
  download: true,
  export: true,
  upload: true,
  createFolder: true,
  update: true,
  delete: true,
};

function rootFolder() {
  return {
    id: ROOT_ID,
    name: 'root',
    displayName: 'root',
    parentId: null,
    type: 'FOLDER',
    isDeletable: true,
    private: false,
    capabilities,
    children: [],
    breadcrumbs: [{ id: ROOT_ID, name: 'root' }],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function mockFilesApi(page: Page, uploads: string[]) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
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
            permissions: { file: ['create', 'read', 'update', 'delete'] },
          },
        },
      });
      return;
    }

    if (method === 'POST' && path === '/api/v1/file/upload') {
      uploads.push(new Date().toISOString());
      // Held in flight so a second click would land while the first is running.
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        json: {
          data: {
            id: `uploaded-${uploads.length}`,
            name: 'double-click.txt',
            displayName: 'double-click.txt',
            parentId: ROOT_ID,
            type: 'FILE',
            isDeletable: true,
            private: false,
            size: 11,
            mimeType: 'text/plain',
            autoLink: { status: 'none' },
            createdAt: NOW,
            updatedAt: NOW,
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/file/root') {
      await route.fulfill({ json: { data: rootFolder() } });
      return;
    }

    if (method === 'GET' && path.startsWith('/api/v1/file/folder/')) {
      await route.fulfill({ json: { data: rootFolder() } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('double clicking Upload queues the file once', async ({ page }) => {
  const uploads: string[] = [];
  await mockFilesApi(page, uploads);

  await page.goto('/app/files');

  await page.getByRole('button', { name: 'Upload' }).first().click({ timeout: 15_000 });

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'double-click.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello world'),
  });

  const submit = dialog.getByRole('button', { name: /^Upload/ });
  await expect(submit).toBeEnabled();

  // Two clicks in one gesture. Driven through the mouse rather than
  // locator.click() so the second one is not retargeted or auto-waited.
  const box = (await submit.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.click(x, y);
  await page.mouse.click(x, y);

  await page.waitForTimeout(2000);

  expect(uploads, 'POST /file/upload requests').toHaveLength(1);
});

test('reopening the dialog uploads again', async ({ page }) => {
  // The guard latches on submit, so it has to release when the dialog reopens
  // or a second, deliberate upload would silently do nothing.
  const uploads: string[] = [];
  await mockFilesApi(page, uploads);

  await page.goto('/app/files');

  for (const round of [1, 2]) {
    await page.getByRole('button', { name: 'Upload' }).first().click({ timeout: 15_000 });

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles({
      name: `round-${round}.txt`,
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    });

    const submit = dialog.getByRole('button', { name: /^Upload/ });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(dialog).toBeHidden();
  }

  await page.waitForTimeout(2000);

  expect(uploads, 'POST /file/upload requests').toHaveLength(2);
});
