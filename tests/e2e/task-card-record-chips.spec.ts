import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1406 — a task card listed its linked records as `PROJECT · EN5KDDDH`,
 * the record's id in uppercase boxes. It now shows them as named chips: the
 * project's name, two at most, then `+N`.
 */

const ACCOUNT_ID = 'account-1';
const NOW = new Date('2026-10-12T14:00:00.000Z');

const freshness = {
  state: 'fresh',
  lastSyncedAt: NOW.toISOString(),
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

const threads = [
  { n: 1, sender: 'Riverside Steel', subject: 'Revised shop drawings', status: 'unset' },
  { n: 2, sender: 'Harbor Glazing', subject: 'Curtain wall submittal', status: 'unset' },
  { n: 3, sender: 'Metro Electric', subject: 'Panel schedule question', status: 'open_our_court' },
  { n: 4, sender: 'Atlas Concrete', subject: 'Pour schedule for level 3', status: 'unset' },
] as const;

async function setupMockApi(page: Page, tasks: unknown[] = []) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-1', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'user-1', name: 'Test User', email: 'user@example.com' },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            userId: 'user-1',
            role: 'admin',
            isDev: false,
            isAdmin: true,
            permissions: { mail: ['read', 'send'] },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts') {
      await route.fulfill({
        json: {
          data: [
            {
              id: ACCOUNT_ID,
              slug: 'mailbox',
              email: 'mailbox@example.com',
              mailboxAddress: 'mailbox@example.com',
              displayName: 'Mailbox',
              nickname: 'mailbox',
              needsNickname: false,
              provider: 'outlook',
              calendarAccess: 'notApplicable',
              status: 'CONNECTED',
              lastSyncedAt: NOW.toISOString(),
              connectedById: 'user-1',
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
              providerId: 'INBOX',
              name: 'Inbox',
              fullName: 'Inbox',
              key: 'inbox',
              totalCount: threads.length,
              unreadCount: 0,
            },
          ],
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages`) {
      await route.fulfill({
        json: {
          data: {
            records: threads.map((thread) => ({
              id: `message-${thread.n}`,
              providerId: `provider-${thread.n}`,
              threadId: `thread-${thread.n}`,
              conversationKey: `thread-${thread.n}`,
              senderName: thread.sender,
              senderEmail: `contact${thread.n}@example.com`,
              subject: thread.subject,
              preview: `${thread.subject} — details inside.`,
              receivedAt: new Date(NOW.getTime() - thread.n * 60 * 60 * 1000).toISOString(),
              folderId: 'folder-inbox',
              folder: 'inbox',
              mailbox: ACCOUNT_ID,
              unread: false,
              keywords: [],
              attachmentCount: 0,
              threadMessageCount: 1,
              classification: {
                conversationKey: `thread-${thread.n}`,
                status: thread.status,
                assignedTo: null,
                references: [],
              },
            })),
            nextPageToken: null,
            pageSize: 100,
            totalCount: threads.length,
            freshness,
          },
        },
      });
      return;
    }

    const conversation = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/thread-(\\d)/messages$`)
    );
    if (method === 'GET' && conversation) {
      const thread = threads.find((item) => item.n === Number(conversation[1]))!;
      await route.fulfill({
        json: {
          messages: [
            {
              id: `message-${thread.n}`,
              providerId: `provider-${thread.n}`,
              senderName: thread.sender,
              senderEmail: `contact${thread.n}@example.com`,
              recipientName: 'Mailbox',
              recipientEmail: 'mailbox@example.com',
              sentAt: NOW.toISOString(),
              folderId: 'folder-inbox',
              keywords: [],
              body: [`${thread.subject} — details inside.`],
              attachments: [],
            },
          ],
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/task/board') {
      const column = { tasks: [], total: 0 };
      await route.fulfill({
        json: {
          data: {
            today: '2026-10-12',
            columns: {
              OVERDUE: column,
              DUE_TODAY: column,
              TOMORROW: column,
              PENDING: { tasks, total: tasks.length },
              COMPLETED: column,
            },
            people: [],
            projects: [],
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

const task = (id: string, title: string, entityLinks: unknown[]) => ({
  id,
  title,
  description: null,
  priority: 'P2',
  status: 'OPEN',
  court: 'OURS',
  dueAt: '2026-10-20T21:00:00.000Z',
  dueHasTime: false,
  completedAt: null,
  assigneeId: null,
  assignee: null,
  entityLinks,
  emailReferences: [],
  boardOrder: null,
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:00:00.000Z',
});

const TASKS = [
  task('t1', 'Testing', [
    { entityType: 'project', entityId: 'EN5KDDDH', label: '30000 - PS 082K', meta: null },
    { entityType: 'project', entityId: '3TM7AIVT', label: '30100 - PS 515X', meta: null },
    {
      entityType: 'project',
      entityId: 'CWBWVES3',
      label: '31700 - JFK NTO Turkish Airlines',
      meta: null,
    },
    { entityType: 'project', entityId: 'BRIRTWX8', label: '2026-001 - Testing', meta: null },
  ]),
  task('t2', 'Chase the steel PO', [
    { entityType: 'purchaseOrder', entityId: 'PO1', label: 'PO-55310 - Halden Steel', meta: null },
  ]),
];

test('a task card names its linked projects, two at most, then +N', async ({ page }) => {
  await setupMockApi(page, TASKS);
  await page.goto('/app/email/accounts/mailbox/inbox?view=tasks');

  const card = page.getByRole('list', { name: 'Linked items' }).first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('PS 082K');
  await expect(card).toContainText('PS 515X');
  await expect(card).toContainText('+2');
  // Never the id, never the shouting type label.
  await expect(card).not.toContainText('EN5KDDDH');
  await expect(card).not.toContainText('PROJECT');

  await expect(page.getByRole('list', { name: 'Linked items' }).nth(1)).toContainText('PO-55310');
});
