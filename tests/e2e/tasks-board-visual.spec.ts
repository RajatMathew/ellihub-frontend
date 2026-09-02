import { expect, test, type Page } from '@playwright/test';

/**
 * A visual check of the board with real-looking data.
 *
 * The board is hard to review empty — the assignee colours, the filter pills
 * and the column counts only mean anything once cards exist. This seeds a
 * spread of tasks through the API the app really calls, so the screenshot it
 * leaves behind is the actual rendered board, not a mockup.
 */

function isoDaysFromNow(days: number, hour = 11) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 42, 0, 0);
  return date.toISOString();
}

function task(overrides: Record<string, unknown>) {
  return {
    id: 'task',
    title: 'Task',
    description: null,
    priority: 'P2',
    status: 'OPEN',
    court: 'OURS',
    dueAt: null,
    dueHasTime: false,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [],
    createdAt: isoDaysFromNow(-10),
    updatedAt: isoDaysFromNow(-10),
    ...overrides,
  };
}

const TASKS = [
  task({
    id: 't1',
    title: 'Chase BK Tile — renewed workers’ comp',
    description: 'Blocks their portion of the next draw.',
    priority: 'P1',
    court: 'THEIRS',
    dueAt: isoDaysFromNow(-5),
    dueHasTime: true,
    assigneeId: 'emp-michelle',
    assignee: { id: 'emp-michelle', name: 'Michelle Iyer', email: 'michelle@ellicorp.com' },
    entityLinks: [{ entityType: 'purchaseOrder', entityId: 'PO-2026-118' }],
    emailReferences: [
      { accountId: 'a1', providerId: 'p1', subject: 'Textura — expired cert', fromEmail: null },
    ],
  }),
  task({
    id: 't2',
    title: 'Approve Brooklyn Solid Surface invoice — 2-way match',
    description: 'Match against PO-118 and delivery receipt.',
    priority: 'P1',
    dueAt: isoDaysFromNow(0),
    dueHasTime: true,
    assigneeId: 'emp-cari',
    assignee: { id: 'emp-cari', name: 'Cari Alvarez', email: 'cari@ellicorp.com' },
    entityLinks: [{ entityType: 'invoice', entityId: 'INV-2026-118' }],
  }),
  task({
    id: 't3',
    title: 'Confirm Boyland hardware receipt on 7/11',
    priority: 'P2',
    court: 'THEIRS',
    dueAt: isoDaysFromNow(3),
    assigneeId: 'emp-alejandra',
    assignee: { id: 'emp-alejandra', name: 'Alejandra Cruz', email: 'alejandra@ellicorp.com' },
    entityLinks: [{ entityType: 'project', entityId: 'BOYLAND' }],
  }),
  task({
    id: 't4',
    title: 'Quarterly vendor COI sweep — 4 vendors flagged',
    priority: 'P3',
    dueAt: isoDaysFromNow(4),
    dueHasTime: true,
    assigneeId: 'emp-lilibell',
    assignee: { id: 'emp-lilibell', name: 'Lilibell Ortiz', email: 'lilibell@ellicorp.com' },
  }),
  task({
    id: 't5',
    title: 'Ridgewood W-9 + COI filed — vendor record updated',
    priority: 'P3',
    status: 'COMPLETED',
    completedAt: isoDaysFromNow(-1),
    dueAt: isoDaysFromNow(-1),
    assigneeId: 'emp-lilibell',
    assignee: { id: 'emp-lilibell', name: 'Lilibell Ortiz', email: 'lilibell@ellicorp.com' },
  }),
  task({
    id: 't6',
    title: 'Draft the close-out checklist',
    priority: 'P2',
    assigneeId: 'emp-cari',
    assignee: { id: 'emp-cari', name: 'Cari Alvarez', email: 'cari@ellicorp.com' },
  }),
];

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
          data: TASKS,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: TASKS.length,
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

test('the board renders its columns, coloured assignees and filter pills', async ({ page }) => {
  // The board seeds local state during render, which loops forever if the tasks
  // prop is rebuilt each render. That failure only shows up as a console error,
  // so watch for it rather than trusting the DOM to look wrong.
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await setupMockApi(page);
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/app/tasks');

  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible({
    timeout: 30_000,
  });

  // Every column the design calls for, plus the undated one the design omits.
  for (const column of ['Overdue', 'Due Today', 'Tomorrow', 'This Week', 'Completed']) {
    await expect(page.getByText(column, { exact: true })).toBeVisible();
  }

  const filters = page.getByRole('group', { name: 'Filter by assignee' });
  await expect(filters).toBeVisible();
  await expect(filters.getByRole('button', { name: 'Everyone' })).toBeVisible();

  await page.screenshot({ path: 'output/visual/task-board.png', animations: 'disabled' });

  // Exercise the filtered path too — `.filter()` returns a fresh array each
  // render and was one of the two sources of the render loop.
  await page
    .getByRole('group', { name: 'Filter by assignee' })
    .getByRole('button', { name: 'Cari' })
    .click();
  await expect(page.getByText('Draft the close-out checklist')).toBeVisible();

  expect(consoleErrors.filter((line) => line.includes('Maximum update depth'))).toEqual([]);
});

test('a filter pill narrows the board to one person', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/app/tasks');

  await expect(page.getByText('Chase BK Tile — renewed workers’ comp')).toBeVisible({
    timeout: 30_000,
  });

  const filters = page.getByRole('group', { name: 'Filter by assignee' });
  await filters.getByRole('button', { name: 'Cari' }).click();

  // Cari's two tasks stay; Michelle's overdue one goes.
  await expect(page.getByText('Draft the close-out checklist')).toBeVisible();
  await expect(page.getByText('Chase BK Tile — renewed workers’ comp')).toHaveCount(0);

  await page.screenshot({ path: 'output/visual/task-board-filtered.png', animations: 'disabled' });
});

test('the chevron beside the initials opens a reassign menu', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/app/tasks');

  const chip = page.getByRole('button', { name: /Assigned to Cari Alvarez/ }).first();
  await expect(chip).toBeVisible({ timeout: 30_000 });
  await chip.click();

  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByText('Assign to')).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Unassign' })).toBeVisible();

  await page.screenshot({ path: 'output/visual/task-assignee-menu.png', animations: 'disabled' });
});

test('a forbidden column says no while the card is still in the air', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/app/tasks');

  const overdueCard = page.getByText('Chase BK Tile — renewed workers’ comp');
  await expect(overdueCard).toBeVisible({ timeout: 30_000 });

  // Pick the overdue card up and hold it over Due Today, which the rules refuse.
  const from = await overdueCard.boundingBox();
  const dueToday = await page.getByText('Due Today', { exact: true }).boundingBox();
  if (!from || !dueToday) throw new Error('could not locate the card or the column');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Past the sensor's 10px activation distance, then onto the column.
  await page.mouse.move(from.x + from.width / 2 + 40, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(dueToday.x + dueToday.width / 2, dueToday.y + 160, { steps: 12 });

  await expect(
    page.getByText('An overdue task can only be completed, not rescheduled here')
  ).toBeVisible();

  await page.screenshot({ path: 'output/visual/task-board-forbidden.png', animations: 'disabled' });
  await page.mouse.up();
});

test('a legal hover opens a gap where the card will land', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/app/tasks');

  const card = page.getByText('Confirm Boyland hardware receipt on 7/11');
  await expect(card).toBeVisible({ timeout: 30_000 });

  const thisWeekCount = () => page.locator('[data-slot="kanban-item"]').count();
  const before = await thisWeekCount();

  const from = await card.boundingBox();
  const tomorrow = await page.getByText('Tomorrow', { exact: true }).boundingBox();
  if (!from || !tomorrow) throw new Error('could not locate the card or the column');

  await page.mouse.move(from.x + from.width / 2, from.y + 20);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 40, from.y + 20, { steps: 5 });
  await page.mouse.move(tomorrow.x + tomorrow.width / 2, tomorrow.y + 120, { steps: 12 });

  // Tomorrow was empty; the card has reflowed into it, so its "column clear"
  // placeholder is gone and the card now sits there before the drop.
  await expect(page.getByText('column clear')).toHaveCount(0);
  expect(await thisWeekCount()).toBe(before);

  await page.screenshot({ path: 'output/visual/task-board-reflow.png', animations: 'disabled' });
  await page.mouse.up();
});
