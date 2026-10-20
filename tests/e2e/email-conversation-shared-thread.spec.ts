import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1264: opening a conversation showed another conversation's messages.
 *
 * Outlook can file unrelated mail under one thread id; the API keys each
 * conversation by `conversationKey` and answers with only its own messages.
 * The client cached by thread id alone, so the second conversation opened was
 * served the first one's messages from the cache.
 */
test.describe.configure({ timeout: 60_000 });

const ACCOUNT_ID = 'account-1';
const NOW = '2026-07-31T10:00:00.000Z';

const freshness = {
  state: 'fresh',
  lastSyncedAt: NOW,
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

// Two unrelated conversations Outlook filed under one thread id. The API
// splits them by `conversationKey` and answers each with its own messages.
const THREAD_ID = 'thread-shared';
const messages = [
  {
    id: 'message-quote',
    threadId: THREAD_ID,
    conversationKey: `${THREAD_ID}::window sills job quote`,
    senderName: 'Quality Solid Surface',
    senderEmail: 'quote@example.com',
    subject: 'Window sills job quote',
    preview: 'Please send new drawings',
    text: 'Please send us new drawings with the changes.',
    receivedAt: '2026-07-31T10:00:00.000Z',
  },
  {
    id: 'message-receipt',
    threadId: THREAD_ID,
    conversationKey: `${THREAD_ID}::receipt m2649`,
    senderName: 'Abbot Paint',
    senderEmail: 'office@example.com',
    subject: 'Receipt m2649',
    preview: 'Please retain the attached receipt',
    text: 'Please retain the attached receipt for your records.',
    receivedAt: '2026-07-31T09:00:00.000Z',
  },
] as const;

async function setupMockApi(page: Page) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-admin', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'user-admin', name: 'Admin User', email: 'admin@elli.com' },
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
              nickname: 'Mailbox',
              needsNickname: false,
              provider: 'gmail',
              calendarAccess: 'notApplicable',
              status: 'connected',
              lastSyncedAt: NOW,
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
              providerId: 'INBOX',
              name: 'Inbox',
              fullName: 'Inbox',
              key: 'inbox',
              totalCount: messages.length,
              unreadCount: messages.length,
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
            records: messages.map((message) => ({
              ...message,
              providerId: `provider-${message.id}`,
              conversationKey: message.conversationKey,
              folderId: 'folder-inbox',
              folder: 'inbox',
              mailbox: ACCOUNT_ID,
              unread: true,
              keywords: [],
              attachmentCount: 0,
              threadMessageCount: 1,
            })),
            nextPageToken: null,
            pageSize: 100,
            totalCount: messages.length,
            freshness,
          },
        },
      });
      return;
    }

    if (
      method === 'GET' &&
      path === `/api/v1/email/accounts/${ACCOUNT_ID}/conversations/${THREAD_ID}/messages`
    ) {
      const conversationKey = new URL(request.url()).searchParams.get('conversationKey');
      const message = messages.find((item) => item.conversationKey === conversationKey);
      await route.fulfill({
        json: {
          messages: message
            ? [
                {
                  id: message.id,
                  providerId: `provider-${message.id}`,
                  senderName: message.senderName,
                  senderEmail: message.senderEmail,
                  recipientName: 'Mailbox',
                  recipientEmail: 'mailbox@example.com',
                  sentAt: message.receivedAt,
                  folderId: 'folder-inbox',
                  keywords: [],
                  body: [`<p>${message.text}</p>`],
                  attachments: [],
                },
              ]
            : [],
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('each conversation on a shared thread opens its own messages', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/app/email/accounts/mailbox');

  await page.getByRole('button', { name: /Quality Solid Surface: Window sills job quote/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Window sills job quote', level: 1 })
  ).toBeVisible();
  await expect(
    page.frameLocator('iframe').first().getByText('Please send us new drawings with the changes.')
  ).toBeVisible();

  await page.getByRole('button', { name: /Abbot Paint: Receipt m2649/ }).click();
  await expect(page.getByRole('heading', { name: 'Receipt m2649', level: 1 })).toBeVisible();

  // Its own message — not the window-sill quote served from the cache.
  await expect(
    page
      .frameLocator('iframe')
      .first()
      .getByText('Please retain the attached receipt for your records.')
  ).toBeVisible();
  await expect(page.getByText('quote@example.com')).toHaveCount(0);
});
