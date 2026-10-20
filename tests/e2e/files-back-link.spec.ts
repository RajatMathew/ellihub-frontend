import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * The explorer's Back link: one level up, named for where it lands, between
 * the page header and the files card. Files and a project's files share the
 * explorer, so this covers both.
 */

test.describe.configure({ timeout: 60_000 });

const NOW = '2026-06-11T00:00:00.000Z';
const ROUTE_TIMEOUT = 15_000;
const ROOT = 'folder-root';
const PROJECTS = 'folder-projects';
const LANGONE = 'folder-langone';

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

const folders: Record<string, { name: string; parent: string | null; children: unknown[] }> = {
  [ROOT]: { name: 'root', parent: null, children: [entry(PROJECTS, 'Projects', ROOT, 'FOLDER')] },
  [PROJECTS]: {
    name: 'Projects',
    parent: ROOT,
    children: [entry(LANGONE, 'NYU Langone', PROJECTS, 'FOLDER')],
  },
  [LANGONE]: {
    name: 'NYU Langone',
    parent: PROJECTS,
    children: [entry('file-bid', 'Bid Set.pdf', LANGONE, 'FILE')],
  },
};

function breadcrumbsOf(id: string) {
  const trail: { id: string; name: string }[] = [];
  for (let at: string | null = id; at; at = folders[at].parent) {
    trail.unshift({ id: at, name: folders[at].name });
  }
  return trail;
}

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
      await route.fulfill({ json: { data: entry(ROOT, 'root', null, 'FOLDER') } });
      return;
    }
    const folderId = path.match(/^\/api\/v1\/file\/folder\/([^/]+)$/)?.[1];
    if (folderId && folders[folderId]) {
      const folder = folders[folderId];
      await route.fulfill({
        json: {
          data: {
            ...entry(folderId, folder.name, folder.parent, 'FOLDER'),
            breadcrumbs: breadcrumbsOf(folderId),
            children: folder.children,
          },
        },
      });
      return;
    }
    await route.fulfill({ json: { data: [] } });
  });
}

const backLink = (page: Page) => page.getByRole('link', { name: /^Back to / });

test('is not offered at the top folder', async ({ page }) => {
  await mockFilesApi(page);
  await page.goto('/app/files');

  await expect(page.getByRole('cell', { name: 'Projects', exact: true })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
  await expect(backLink(page)).toHaveCount(0);
});

test('goes one level up, named for where it lands', async ({ page }) => {
  await mockFilesApi(page);
  await page.goto(`/app/files?folderId=${LANGONE}&view=list`);

  await expect(page.getByRole('cell', { name: 'Bid Set.pdf', exact: true })).toBeVisible({
    timeout: ROUTE_TIMEOUT,
  });
  await expect(backLink(page)).toHaveText('Back to Projects');

  await backLink(page).click();

  await expect(page).toHaveURL(new RegExp(`folderId=${PROJECTS}`));
  await expect(page).toHaveURL(/view=list/);
  await expect(page.getByRole('cell', { name: 'NYU Langone', exact: true })).toBeVisible();
  await expect(backLink(page)).toHaveText('Back to Files');

  await backLink(page).click();

  await expect(page).not.toHaveURL(/folderId=/);
  await expect(page.getByRole('cell', { name: 'Projects', exact: true })).toBeVisible();
  await expect(backLink(page)).toHaveCount(0);
});

test('ends a search, as leaving a folder any other way does', async ({ page }) => {
  await mockFilesApi(page);
  await page.goto(`/app/files?folderId=${LANGONE}&search=bid`);

  await expect(backLink(page)).toBeVisible({ timeout: ROUTE_TIMEOUT });
  await expect(backLink(page)).toHaveAttribute('href', `/app/files?folderId=${PROJECTS}`);
});
