import { expect, test, type Page } from '@playwright/test';

/**
 * A visual check of the board with real-looking data.
 *
 * The board is hard to review empty — the assignee colours, the filter pills
 * and the column counts only mean anything once cards exist. This seeds a
 * spread of tasks through the API the app really calls, so the screenshot it
 * leaves behind is the actual rendered board, not a mockup.
 */

/**
 * A column heading, matched by its start.
 *
 * "Due Today" and "Tomorrow" carry the date after a comma, so an exact match
 * stopped finding them - and every drag test locates its target column this way.
 */
function columnHeading(page: Page, label: string) {
  return page.getByText(new RegExp(`^${label}(,|$)`));
}

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
  const updates: { id: string; dueAt?: string | null }[] = [];

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

    if (method === 'PUT' && path === '/api/v1/task') {
      const body = request.postDataJSON() as { id: string; dueAt?: string | null };
      updates.push(body);
      const original = TASKS.find((item) => item.id === body.id) ?? TASKS[0];
      await route.fulfill({ json: { success: true, data: { ...original, ...body } } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return { updates };
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

  // Every column the design calls for. Due Today and Tomorrow carry the date
  // beside them now, so the heading is matched by its start rather than whole.
  for (const column of ['Overdue', 'Due Today', 'Tomorrow', 'Pending', 'Completed']) {
    await expect(columnHeading(page, column)).toBeVisible();
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
  const dueToday = await columnHeading(page, 'Due Today').boundingBox();
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
  const tomorrow = await columnHeading(page, 'Tomorrow').boundingBox();
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

test('dropping a card on another column saves its new due date', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/app/tasks');

  const card = page.getByText('Confirm Boyland hardware receipt on 7/11');
  await expect(card).toBeVisible({ timeout: 30_000 });

  const from = await card.boundingBox();
  const tomorrow = await columnHeading(page, 'Tomorrow').boundingBox();
  if (!from || !tomorrow) throw new Error('could not locate the card or the column');

  await page.mouse.move(from.x + from.width / 2, from.y + 20);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 40, from.y + 20, { steps: 5 });
  await page.mouse.move(tomorrow.x + tomorrow.width / 2, tomorrow.y + 120, { steps: 12 });
  await page.mouse.up();

  // The reflow moves the card locally; the drop must still persist the date.
  await expect.poll(() => api.updates.length).toBe(1);
  expect(api.updates[0].id).toBe('t3');

  const saved = new Date(api.updates[0].dueAt ?? '');
  const expected = new Date();
  expected.setDate(expected.getDate() + 1);
  expect(saved.toDateString()).toBe(expected.toDateString());
});

test('a selected filter pill leaves its assignee avatar the colour it already was', async ({
  page,
}) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1600, height: 950 });
  await page.goto('/app/tasks');

  await expect(page.getByText('Chase BK Tile — renewed workers’ comp')).toBeVisible({
    timeout: 30_000,
  });

  const filters = page.getByRole('group', { name: 'Filter by assignee' });
  const pill = filters.getByRole('button', { name: 'Cari' });
  const avatar = pill.locator('[data-slot="avatar"]');

  // Read as pixels rather than as classes on purpose: the tint is the same
  // translucent rgba() in either state, and what changes is the pill beneath
  // it — which is how the initials came to sit navy on navy. The clip is taken
  // from the middle of the circle, so the pill showing through the corners of a
  // square bounding box is not part of the comparison, and it is re-measured in
  // each state because the outline pill's 1px border shifts its contents over
  // when the border goes away. The mouse is parked off the bar so the pill's
  // hover colour is not measured either.
  const faceOfTheAvatar = async () => {
    const box = await avatar.boundingBox();
    if (!box) throw new Error('could not locate the avatar');
    const inset = box.width / 4;
    return page.screenshot({
      animations: 'disabled',
      clip: {
        x: box.x + inset,
        y: box.y + inset,
        width: box.width - inset * 2,
        height: box.height - inset * 2,
      },
    });
  };

  await page.mouse.move(0, 0);
  const unselected = await faceOfTheAvatar();

  await pill.click();
  await page.mouse.move(0, 0);
  await expect(pill).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Chase BK Tile — renewed workers’ comp')).toHaveCount(0);

  expect((await faceOfTheAvatar()).equals(unselected)).toBe(true);
});
