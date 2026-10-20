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

async function setupMockApi(page: Page, overrides: Record<string, unknown> = {}) {
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
    ...overrides,
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

test('pointing at the circle closes its dotted ring', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  const circle = page.getByRole('checkbox', { name: 'Complete Chase the certificate' });
  await expect(circle).toBeVisible({ timeout: 30_000 });

  // The ring is the checkbox's next sibling: dotted at rest, solid while the
  // circle is pointed at, as the TaskCard design draws it (elli-ui#1479).
  const ring = circle.locator('xpath=following-sibling::*[1]').locator('circle');
  await expect(ring).not.toHaveCSS('stroke-dasharray', '100px, 0px');

  await circle.hover();
  await expect(ring).toHaveCSS('stroke-dasharray', '100px, 0px');

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
  await page.getByRole('button', { name: 'Push due date by one day', exact: true }).click();

  // The ring is the colour the completion circle fills with, so the beat and
  // the landing read as one gesture. Held at its first frame by the pause
  // above, this leaves it on screen to be looked at.
  await page.screenshot({ path: 'output/visual/task-landed-ring.png' });
});

test('pointing at the court shows the swap it would make', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  // Exact: every card is wrapped in a dnd-kit sortable that is itself a button
  // carrying the card's whole text, so a substring match finds both.
  const court = page.getByRole('button', {
    name: 'Our court. Move to their court',
    exact: true,
  });
  await expect(court).toBeVisible({ timeout: 30_000 });

  // The swap arrow slides in after the word on hover (elli-ui#1479).
  const swap = court.locator('span').last();
  await expect(swap).toHaveCSS('opacity', '0');

  await court.hover();
  await expect(swap).toHaveCSS('opacity', '1');

  await page.screenshot({ path: 'output/visual/task-court-hover.png' });
});

test("opening an email's linked records keeps the email stack open", async ({ page }) => {
  const linked = (n: number) => ({
    type: 'purchaseOrder',
    entityType: 'purchaseOrder',
    entityId: `po-${n}`,
    label: `PO-5531${n} - Halden Steel`,
  });
  await setupMockApi(page, {
    emailReferences: [
      { accountId: 'a1', providerId: 'p1', subject: 'Requisition for March', fromEmail: 'a@x.com' },
      {
        accountId: 'a1',
        providerId: 'p2',
        subject: 'PO-25768 change',
        fromEmail: 'b@x.com',
        linkedItems: [linked(1), linked(2), linked(3)],
      },
    ],
  });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  const stack = page.getByRole('group', { name: 'Raised from 2 emails' });
  await expect(stack).toBeVisible({ timeout: 30_000 });

  await stack.hover();
  await expect(stack).toHaveAttribute('data-open', 'true');

  // The list renders in a portal, so opening it moves focus out of the stack —
  // which used to fold the stack up under it and spring it back (elli-ui#1479).
  // It comes back on its own within a beat, so every state it passes through
  // is recorded, not just where it ends up.
  await stack.evaluate((element) => {
    const seen: string[] = [];
    (window as unknown as { stackStates: string[] }).stackStates = seen;
    new MutationObserver(() => seen.push(element.getAttribute('data-open') ?? '')).observe(
      element,
      { attributes: true, attributeFilter: ['data-open'] }
    );
  });
  await stack.getByRole('button', { name: 'Show all 3 linked records' }).click();
  await expect(page.getByRole('list', { name: '3 linked records' })).toBeVisible();
  await page.waitForTimeout(400);
  await expect(stack).toHaveAttribute('data-open', 'true');
  const states = await page.evaluate(
    () => (window as unknown as { stackStates: string[] }).stackStates
  );
  expect(states).not.toContain('false');

  // Closed with the pointer gone, the stack folds back up.
  await page.mouse.move(5, 5);
  await page.keyboard.press('Escape');
  await expect(stack).toHaveAttribute('data-open', 'false');
});

test('a press outside folds an open email stack, even on a control that keeps its pointerdown', async ({
  page,
}) => {
  const linked = (n: number) => ({
    type: 'purchaseOrder',
    entityType: 'purchaseOrder',
    entityId: `po-${n}`,
    label: `PO-5531${n} - Halden Steel`,
  });
  await setupMockApi(page, {
    emailReferences: [
      { accountId: 'a1', providerId: 'p1', subject: 'Requisition for March', fromEmail: 'a@x.com' },
      {
        accountId: 'a1',
        providerId: 'p2',
        subject: 'PO-25768 change',
        fromEmail: 'b@x.com',
        linkedItems: [linked(1), linked(2), linked(3)],
      },
    ],
  });
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/app/tasks');

  const stack = page.getByRole('group', { name: 'Raised from 2 emails' });
  await expect(stack).toBeVisible({ timeout: 30_000 });
  await stack.hover();
  await stack.getByRole('button', { name: 'Show all 3 linked records' }).click();
  await expect(page.getByRole('list', { name: '3 linked records' })).toBeVisible();

  // The card's own controls stop pointerdown so a drag cannot start on them;
  // a press there never reached the popover's outside-click check, and the
  // stack stayed open until the card itself was clicked (elli-ui#1479).
  await page.evaluate(() => {
    // Not focusable, so the press moves no focus and only the pointerdown can
    // say the user went elsewhere.
    const blocker = document.createElement('div');
    blocker.textContent = 'Elsewhere';
    blocker.dataset.testid = 'elsewhere';
    blocker.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:9999;padding:8px';
    blocker.addEventListener('pointerdown', (event) => event.stopPropagation());
    document.body.append(blocker);
  });
  await page.getByTestId('elsewhere').click();

  await expect(stack).toHaveAttribute('data-open', 'false');
});
