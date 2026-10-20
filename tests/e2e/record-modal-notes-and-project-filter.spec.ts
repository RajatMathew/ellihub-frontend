import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1378 — Inbox mail opened and left without an action is called out
 * above the list once it has waited, and clears when the reader says it needs
 * nothing.
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

async function setupMockApi(page: Page, projects: { id: string; name: string }[] = []) {
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
              PENDING: column,
              COMPLETED: column,
            },
            people: [],
            projects,
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('the description box grows with what is typed, from one line', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/app/email/accounts/mailbox/inbox?view=tasks');
  await page.getByRole('button', { name: 'New task' }).first().click();

  const notes = page.getByLabel('Description');
  const empty = (await notes.boundingBox())!.height;
  // One 24px line, not the three it used to reserve.
  expect(empty).toBeLessThan(40);

  await notes.fill('Line one\nLine two\nLine three\nLine four');
  const grown = (await notes.boundingBox())!.height;
  expect(grown).toBeGreaterThan(empty * 3);

  await notes.fill('');
  expect((await notes.boundingBox())!.height).toBeLessThan(40);
});

test('the project filter is there before any task has a project', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/app/email/accounts/mailbox/inbox?view=tasks');

  const filter = page.getByRole('button', { name: /Filter by project/ });
  await expect(filter).toBeVisible();
  await filter.click();
  await expect(
    page.getByText('No task is linked to a project yet.', { exact: false })
  ).toBeVisible();
});

test('the project filter lists projects by name', async ({ page }) => {
  await setupMockApi(page, [{ id: 'p1', name: '30000 - PS 082K' }]);
  await page.goto('/app/email/accounts/mailbox/inbox?view=tasks');

  await page.getByRole('button', { name: /Filter by project/ }).click();
  await expect(page.getByRole('option', { name: '30000 - PS 082K' })).toBeVisible();
});
