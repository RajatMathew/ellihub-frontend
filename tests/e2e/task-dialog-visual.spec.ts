import { expect, test, type Page } from '@playwright/test';

/**
 * A visual check of the create-task dialog.
 *
 * The dialog is the one screen in the feature with no design to diff against in
 * code review — its layout is the whole point of it. This renders the real
 * thing against a mocked API and leaves a screenshot behind, the same way
 * tasks-board-visual.spec.ts does for the board.
 */
async function setupMockApi(page: Page) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 's1', userId: 'user-admin', expiresAt: '2027-01-01T00:00:00.000Z' },
          user: { id: 'user-admin', name: 'Elli Admin', email: 'admin@elli.com' },
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
            permissions: { task: ['create', 'read', 'update', 'delete'] },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/task') {
      await route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('the create dialog lays out title, priority, court, due and assignee', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/app/tasks');

  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'New task' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('New Task')).toBeVisible();

  // The title has no label of its own: the placeholder is the label.
  await expect(dialog.getByPlaceholder('Add a title')).toBeVisible();

  // Priority and court are segmented controls, one option pressed in each.
  const priority = dialog.getByRole('group', { name: 'Priority' });
  await expect(priority.getByRole('radio', { name: 'P3' })).toHaveAttribute('data-state', 'on');
  const court = dialog.getByRole('group', { name: 'Ball in court' });
  await expect(court.getByRole('radio', { name: 'Ours' })).toHaveAttribute('data-state', 'on');

  // The detail box stays folded away until it is wanted.
  const description = dialog.getByRole('button', { name: 'Add description' });
  await expect(description).toBeVisible();
  await expect(dialog.getByPlaceholder('Any detail worth keeping.')).toBeHidden();

  await page.screenshot({
    path: 'output/visual/task-dialog.png',
    animations: 'disabled',
  });

  // And opens on demand.
  await description.click();
  await expect(dialog.getByPlaceholder('Any detail worth keeping.')).toBeVisible();

  await page.screenshot({
    path: 'output/visual/task-dialog-description-open.png',
    animations: 'disabled',
  });
});
