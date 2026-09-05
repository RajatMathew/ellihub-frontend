import { expect, test, type Page } from '@playwright/test';

/**
 * Proves the two things a real mailbox gives you, without needing one.
 *
 * Only the provider-supplied data is faked — the connected account and its
 * messages, exactly what the Google OAuth approval would unlock. Everything
 * else is the real app: the real workspace header, the real reading pane, the
 * real popover, and the real request the task API will receive. So when the
 * OAuth app finally lets an account through, this same path is what runs.
 */

const ACCOUNT_ID = 'task-account';
const ACCOUNT_SLUG = 'task-account-slug';
const ADDRESS = 'procurement@ellicorp.com';
const MESSAGE_ID = 'message-1';
const PROVIDER_ID = 'provider-message-1';
const CONVERSATION_KEY = 'conversation-1';
const SUBJECT = 'Approve Brooklyn Solid Surface invoice';

const freshness = {
  state: 'fresh',
  lastSyncedAt: '2026-09-01T10:00:00.000Z',
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

const message = {
  id: MESSAGE_ID,
  providerId: PROVIDER_ID,
  threadId: 'thread-1',
  conversationKey: CONVERSATION_KEY,
  senderName: 'Brooklyn Solid Surface Co.',
  senderEmail: 'ap@brooklynsolidsurface.com',
  subject: SUBJECT,
  preview: 'Match against PO-118 and delivery receipt.',
  receivedAt: '2026-09-01T11:42:00.000Z',
  folderId: 'folder-inbox',
  folder: 'Inbox',
  mailbox: ADDRESS,
  unread: false,
  body: ['Match against PO-118 and delivery receipt — quantities and freight tie out.'],
};

type CreatedTask = {
  title: string;
  priority: string;
  emailReferences?: { accountId: string; providerId: string; subject?: string | null }[];
};

// One task citing five threads, which is what puts the card over its limit.
const MULTI_REFERENCE_TASKS = [
  {
    id: 'multi-1',
    title: 'Reconcile the Boyland submittals',
    description: null,
    priority: 'P2',
    status: 'OPEN',
    court: 'OURS',
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    dueHasTime: true,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [1, 2, 3, 4, 5].map((n) => ({
      accountId: ACCOUNT_ID,
      providerId: `ref-${n}`,
      conversationKey: `conv-${n}`,
      threadId: `thread-${n}`,
      subject: `Reference thread ${n}`,
      fromEmail: `sender${n}@example.com`,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function setupMockApi(page: Page) {
  const createdTasks: CreatedTask[] = [];

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
            permissions: { mail: ['read'], task: ['create', 'read', 'update', 'delete'] },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/config') {
      await route.fulfill({
        json: { data: { enabledProviders: ['gmail', 'outlook', 'zoho'], maxPersonalAccounts: 5 } },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/quick-shortcuts') {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts') {
      await route.fulfill({
        json: {
          data: [
            {
              id: ACCOUNT_ID,
              slug: ACCOUNT_SLUG,
              email: ADDRESS,
              mailboxAddress: ADDRESS,
              displayName: ADDRESS,
              nickname: ADDRESS,
              needsNickname: false,
              provider: 'outlook',
              calendarAccess: 'granted',
              status: 'CONNECTED',
              lastSyncedAt: freshness.lastSyncedAt,
              connectedById: 'user-admin',
              freshness,
            },
          ],
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/folders`) {
      await route.fulfill({
        json: {
          data: [
            {
              id: 'folder-inbox',
              providerId: 'inbox',
              name: 'Inbox',
              fullName: 'Inbox',
              parentId: null,
              key: 'inbox',
              totalCount: 1,
              unreadCount: 0,
            },
          ],
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/tags`) {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages`) {
      await route.fulfill({
        json: {
          data: {
            records: [message],
            nextPageToken: null,
            pageSize: 100,
            totalCount: 1,
            freshness,
          },
        },
      });
      return;
    }

    // The task API is the real contract this feature writes against.
    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages/search`) {
      const term = (new URL(request.url()).searchParams.get('q') || '').toLowerCase();
      const extras = [3, 4, 5, 6, 7, 8].map((n) => ({
        providerId: `p-extra-${n}`,
        threadId: `t-extra-${n}`,
        conversationKey: `c-extra-${n}`,
        subject: `Alpha follow-up ${n}`,
        senderName: 'Apex Hardware',
        senderEmail: 'apex@example.com',
        preview: 'more',
        receivedAt: new Date().toISOString(),
        folder: 'inbox',
      }));
      const all = [
        ...extras,
        {
          providerId: 'p-alpha',
          threadId: 't-alpha',
          conversationKey: 'c-alpha',
          subject: 'Alpha submittal overdue',
          senderName: 'Apex Hardware',
          senderEmail: 'apex@example.com',
          preview: 'chasing',
          receivedAt: new Date().toISOString(),
          folder: 'archive',
        },
        {
          providerId: 'p-beta',
          threadId: 't-beta',
          conversationKey: 'c-beta',
          subject: 'Beta invoice mismatch',
          senderName: 'Brooklyn Solid Surface',
          senderEmail: 'bss@example.com',
          preview: 'two-way',
          receivedAt: new Date().toISOString(),
          folder: 'sent',
        },
      ].filter((m) => m.subject.toLowerCase().includes(term) || term === 'a');
      await route.fulfill({ json: { success: true, data: all } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/task') {
      await route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: MULTI_REFERENCE_TASKS,
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

    if (method === 'POST' && path === '/api/v1/task') {
      const body = request.postDataJSON() as CreatedTask;
      createdTasks.push(body);
      await route.fulfill({
        status: 201,
        json: {
          success: true,
          message: 'OK',
          data: {
            id: 'task-created-1',
            title: body.title,
            description: null,
            priority: body.priority,
            status: 'OPEN',
            court: 'OURS',
            dueAt: null,
            dueHasTime: false,
            completedAt: null,
            assigneeId: null,
            assignee: null,
            entityLinks: [],
            emailReferences: body.emailReferences ?? [],
            createdAt: '2026-09-01T12:00:00.000Z',
            updatedAt: '2026-09-01T12:00:00.000Z',
          },
        },
      });
      return;
    }

    // Anything else the mailbox asks for is not what this test is about.
    await route.fulfill({ json: { data: null } });
  });

  return { createdTasks };
}

test('the open email is attached by default and more can be added', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();
  const popover = page.getByRole('dialog');
  await expect(popover).toBeVisible();

  // The open message is there without anyone asking for it.
  await expect(popover.getByText(SUBJECT, { exact: false }).first()).toBeVisible();

  // And it cannot be removed while it is the only one.
  const removeFirst = popover.getByRole('button', { name: /^Remove / });
  await expect(removeFirst).toBeDisabled();

  await popover.getByRole('button', { name: 'Attach another email' }).click();
  const picker = page.getByPlaceholder('Search subject or sender');
  await expect(picker).toBeVisible();
  await picker.fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: 'output/visual/tmp-refs-picker.png', animations: 'disabled' });

  await page.getByText('Alpha submittal overdue').click();
  await page.keyboard.press('Escape');

  // Two chips now, and the first has become removable.
  await expect(popover.getByRole('button', { name: /^Remove / })).toHaveCount(2);
  await expect(popover.getByRole('button', { name: /^Remove / }).first()).toBeEnabled();
  await page.screenshot({ path: 'output/visual/tmp-refs-chips.png', animations: 'disabled' });
});

test('a task created this way sends every attached email', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();
  const popover = page.getByRole('dialog');
  await popover.getByRole('button', { name: 'Attach another email' }).click();
  await page.getByPlaceholder('Search subject or sender').fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15000 });
  await page.getByText('Alpha submittal overdue').click();
  await page.keyboard.press('Escape');

  await popover.getByRole('button', { name: 'Add task' }).click();
  await expect.poll(() => api.createdTasks.length, { timeout: 15000 }).toBeGreaterThan(0);
  const refs = api.createdTasks[0].emailReferences;
  expect(refs).toHaveLength(2);
});

test('a card shows three sources and hides the rest behind a count', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto('/app/tasks');

  await expect(page.getByText('Reconcile the Boyland submittals')).toBeVisible({
    timeout: 30_000,
  });

  // Three of five, and the other two behind a count rather than a taller card.
  await expect(page.getByText('Reference thread 3')).toBeVisible();
  await expect(page.getByText('Reference thread 4')).toBeHidden();

  // `exact` matters: the dnd-kit wrapper around the card is itself role=button,
  // and its accessible name is the whole card's text, so a substring match finds
  // it too.
  // Each source is a way back into the mail, not a note about it.
  const firstSource = page.getByRole('link', { name: 'Reference thread 1' });
  await expect(firstSource).toBeVisible();
  await expect(firstSource).toHaveAttribute(
    'href',
    `/app/email/accounts/${ACCOUNT_SLUG}/inbox/id/conv-1`
  );

  const more = page.getByRole('button', { name: '+2', exact: true });
  await expect(more).toBeVisible();
  await page.screenshot({
    path: 'output/visual/task-card-email-sources.png',
    animations: 'disabled',
  });

  await more.click();
  await expect(page.getByText('Reference thread 4')).toBeVisible();
  await expect(page.getByText('Reference thread 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show less', exact: true })).toBeVisible();
  await page.screenshot({
    path: 'output/visual/task-card-email-sources-expanded.png',
    animations: 'disabled',
  });
});

test('clicking a source opens that email', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/app/tasks');

  const source = page.getByRole('link', { name: 'Reference thread 2' });
  await expect(source).toBeVisible({ timeout: 30_000 });
  await source.click();

  await expect(page).toHaveURL(new RegExp(`/app/email/accounts/${ACCOUNT_SLUG}/inbox/id/conv-2$`));
});

test('Clear all stops at the one email the view requires', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();

  const popover = page.getByRole('dialog');
  await popover.getByRole('button', { name: 'Attach another email' }).click();

  // Nothing to clear while the only email is the required one.
  const clearAll = page.getByRole('button', { name: 'Clear all' });
  await expect(clearAll).toBeDisabled();

  await page.getByPlaceholder('Search subject or sender').fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Alpha submittal overdue').click();
  await expect(popover.getByRole('button', { name: /^Remove / })).toHaveCount(2);

  // Now it has something to do — and stops at one rather than emptying.
  await expect(clearAll).toBeEnabled();
  await clearAll.click();
  await expect(popover.getByRole('button', { name: /^Remove / })).toHaveCount(1);
  await expect(clearAll).toBeDisabled();
});

test('the picker does not resize as results arrive', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Attach another email' }).click();

  // Sized to its content, the results list grew as matches arrived and Radix
  // re-anchored the panel around it — it jumped up the screen mid-keystroke.
  // A fixed height is the fix, so the list is what this measures: same box
  // empty or full. Asserting the panel's position instead looks like the
  // symptom but barely moves under test, where there is room below it to grow
  // into; the list height is the mechanism and is exact.
  const list = page.locator('[cmdk-list]');
  const empty = await list.boundingBox();

  await page.getByPlaceholder('Search subject or sender').fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15_000 });
  const full = await list.boundingBox();

  // Not pixel-exact: cmdk drives its own list height through a CSS variable, so
  // the two states land ~13px apart even when pinned. Unpinned they are ~193px
  // apart — an empty list of 63px against a full one of 256 — which is the jump
  // this guards against. Anything under 40 is pinned; anything over is not.
  expect(Math.abs((full?.height ?? 0) - (empty?.height ?? 0))).toBeLessThan(40);
});
