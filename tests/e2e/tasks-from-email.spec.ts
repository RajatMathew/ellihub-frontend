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

test('a mailbox offers Mail, Tasks and Calendar, and the Tasks tab shows the board', async ({
  page,
}) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);

  const tabs = page.getByRole('tablist', { name: 'Mailbox workspace' });
  // A cold Vite compile can push first paint past the default 5s expect timeout.
  await expect(tabs).toBeVisible({ timeout: 30_000 });
  await expect(tabs.getByRole('tab', { name: 'Mail' })).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'Tasks' })).toBeVisible();
  await expect(tabs.getByRole('tab', { name: 'Calendar' })).toBeVisible();

  await tabs.getByRole('tab', { name: 'Tasks' }).click();

  // The board, not the old "Tasks are coming next" placeholder.
  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible();
  await expect(page.getByText('Tasks are coming next')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'New task' }).first()).toBeVisible();

  await page.screenshot({
    path: 'output/visual/mailbox-tasks-tab.png',
    animations: 'disabled',
  });
});

test('an open email can raise a task from a popover, linked to that email', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);

  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await expect(page.getByRole('heading', { name: SUBJECT })).toBeVisible();

  const trigger = page.getByRole('button', { name: 'Add task for this email' });
  await expect(trigger).toBeVisible();
  await trigger.click();

  // A popover, deliberately not a modal: the email stays visible behind it.
  const popover = page.getByRole('dialog');
  await expect(popover).toBeVisible();
  await expect(page.getByRole('heading', { name: SUBJECT })).toBeVisible();

  // The subject seeds the title so the common case is one click.
  const title = popover.getByLabel('Task');
  await expect(title).toHaveValue(SUBJECT);

  // animations disabled so the shot is the settled state, not a mid-fade frame
  await page.screenshot({ path: 'output/visual/add-task-popover.png', animations: 'disabled' });

  await title.fill('Approve Brooklyn invoice — 2-way match');
  await popover.getByRole('button', { name: 'Add task' }).click();

  await expect.poll(() => api.createdTasks.length).toBe(1);

  const created = api.createdTasks[0];
  expect(created.title).toBe('Approve Brooklyn invoice — 2-way match');
  expect(created.emailReferences?.[0]).toMatchObject({
    accountId: ACCOUNT_ID,
    providerId: PROVIDER_ID,
    subject: SUBJECT,
  });
});

test('the popover refuses a task with no title', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);

  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();

  const popover = page.getByRole('dialog');
  await popover.getByLabel('Task').fill('   ');
  await popover.getByRole('button', { name: 'Add task' }).click();

  await expect(popover.getByText('A task needs a title')).toBeVisible();
  expect(api.createdTasks).toHaveLength(0);
});
