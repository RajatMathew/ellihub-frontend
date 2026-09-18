import { expect, test, type Page } from '@playwright/test';

import { groupTasksByColumn, TASK_COLUMNS } from '../../src/modules/tasks/lib/task-board';

/**
 * The completion circle and the court label on a task card — elli-ui#829 and
 * the hover states around it.
 *
 * The beat that used to hold the circle filled before the card left is gone:
 * the card fades out where it sat and slides into Completed, and that motion
 * says "done" on its own. What remains here is what the circle promises before
 * the click - the ghost tick on hover - and the ring a landed card wears.
 */

async function setupMockApi(page: Page) {
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

    // The board arrives grouped, the way tasks-board-visual.spec.ts serves it.
    if (method === 'GET' && path === '/api/v1/task/board') {
      const grouped = groupTasksByColumn([task], new Date());
      const columns = Object.fromEntries(
        TASK_COLUMNS.map((id) => [id, { tasks: grouped[id], total: grouped[id].length }])
      );
      await route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: { today: new Date().toISOString().slice(0, 10), columns, people: [] },
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
      await route.fulfill({ json: { success: true, data: { ...task, status: 'COMPLETED' } } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('pointing at the circle previews the mark it would leave', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  const circle = page.getByRole('checkbox', { name: 'Complete Chase the certificate' });
  await expect(circle).toBeVisible({ timeout: 30_000 });

  // The ghost tick is a sibling of the checkbox, hidden until the checkbox is
  // hovered. Opacity is the only thing that changes, so that is what is read.
  const ghost = circle.locator('xpath=following-sibling::*[1]');
  await expect(ghost).toHaveCSS('opacity', '0');

  await circle.hover();
  await expect(ghost).not.toHaveCSS('opacity', '0');

  await page.screenshot({ path: 'output/visual/task-circle-hover.png' });
});

test('the landing ring is drawn in the completion colour, not near-black', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  const card = page.getByText('Chase the certificate');
  await expect(card).toBeVisible({ timeout: 30_000 });

  // +1 day rings the card where it lands. The ring is a 1.2s box-shadow, so it
  // is caught by freezing the animation part-way rather than raced.
  // Paused before the click, not after: the ring fades from full strength to
  // nothing over 1.2s, so pausing afterwards catches whatever is left. Pausing
  // first holds it at the first frame, which is the colour under test.
  await page.addStyleTag({
    content: '* { animation-play-state: paused !important; }',
  });

  await card.hover();
  await page.getByRole('button', { name: '+1 day', exact: true }).click();

  // The ring is the colour the completion circle fills with, so the beat and
  // the landing read as one gesture. Held at its first frame by the pause
  // above, this leaves it on screen to be looked at.
  await page.screenshot({ path: 'output/visual/task-landed-ring.png' });
});

test('pointing at the court underlines it', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  // Exact: every card is wrapped in a dnd-kit sortable that is itself a button
  // carrying the card's whole text, so a substring match finds both.
  const court = page.getByRole('button', {
    name: 'Our court. Hand over to their court',
    exact: true,
  });
  await expect(court).toBeVisible({ timeout: 30_000 });

  // The line lands on the words, not the dot, so the label is what is read.
  const label = court.getByText('Our court');
  await expect(label).toHaveCSS('text-decoration-line', 'none');

  await court.hover();
  await expect(label).toHaveCSS('text-decoration-line', 'underline');

  await page.screenshot({ path: 'output/visual/task-court-hover.png' });
});
