import { expect, test, type Page } from '@playwright/test';

/**
 * The completion beat — elli-ui#829.
 *
 * Ticking a task used to be the card vanishing, which reads as "gone" rather
 * than "done". The circle now fills and holds before the card leaves, and the
 * only way to prove a beat happened is to look while it is happening: the save
 * is held open so the held state stays on screen to be seen.
 */
async function setupMockApi(page: Page, holdCompleteMs = 0) {
  const task = {
    id: 't1',
    title: 'Chase the certificate',
    description: null,
    priority: 'P2',
    status: 'OPEN',
    court: 'OURS',
    dueAt: new Date().toISOString(),
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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
          data: [task],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });
      return;
    }

    if (method === 'PATCH' && path === '/api/v1/task/complete') {
      // Held open so the card cannot leave while we are looking at it.
      if (holdCompleteMs) await new Promise((resolve) => setTimeout(resolve, holdCompleteMs));
      await route.fulfill({ json: { success: true, data: { ...task, status: 'COMPLETED' } } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('the circle fills and holds before the card leaves', async ({ page }) => {
  await setupMockApi(page, 3_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  const circle = page.getByRole('checkbox', { name: 'Complete Chase the certificate' });
  await expect(circle).toBeVisible({ timeout: 30_000 });

  // Not held before the click - otherwise the assertion below proves nothing.
  await expect(circle).not.toHaveAttribute('data-completing', 'true');

  await circle.click();

  // The beat itself: filled, and the card still on screen behind it.
  await expect(circle).toHaveAttribute('data-completing', 'true');
  await expect(page.getByText('Chase the certificate')).toBeVisible();

  await page.screenshot({ path: 'output/visual/task-completion-beat.png', animations: 'disabled' });

  // And it lets go rather than claiming success forever.
  await expect(circle).not.toHaveAttribute('data-completing', 'true', { timeout: 5_000 });
});
