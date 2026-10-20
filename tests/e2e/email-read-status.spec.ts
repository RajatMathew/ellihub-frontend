import { expect, test, type Page } from '@playwright/test';

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

const messages = [
  {
    id: 'message-1',
    threadId: 'thread-1',
    senderName: 'First Client',
    senderEmail: 'first@example.com',
    subject: 'First unread',
    preview: 'First message body',
    receivedAt: '2026-07-31T10:00:00.000Z',
  },
  {
    id: 'message-2',
    threadId: 'thread-2',
    senderName: 'Second Client',
    senderEmail: 'second@example.com',
    subject: 'Second unread',
    preview: 'Second message body',
    receivedAt: '2026-07-31T09:00:00.000Z',
  },
] as const;

async function setupMockApi(page: Page) {
  const unreadById = new Map(messages.map((message) => [message.id, true]));
  const conversationRequests: string[] = [];
  const statusRequests: string[] = [];
  let messagesFetches = 0;
  let releaseFirstConversationRequest: (() => void) | undefined;
  let releaseFirstStatusRequest: (() => void) | undefined;
  const firstConversationGate = new Promise<void>((resolve) => {
    releaseFirstConversationRequest = resolve;
  });
  const firstStatusGate = new Promise<void>((resolve) => {
    releaseFirstStatusRequest = resolve;
  });

  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;
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
            permissions: { mail: ['read'] },
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
              provider: 'gmail',
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
              unreadCount: Array.from(unreadById.values()).filter(Boolean).length,
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
      messagesFetches += 1;
      await route.fulfill({
        json: {
          data: {
            records: messages.map((message) => ({
              ...message,
              providerId: `provider-${message.id}`,
              conversationKey: message.threadId,
              folderId: 'folder-inbox',
              folder: 'inbox',
              mailbox: ACCOUNT_ID,
              unread: unreadById.get(message.id) ?? false,
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

    const conversationMatch = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/(thread-[12])/messages$`)
    );
    if (method === 'GET' && conversationMatch) {
      const threadId = conversationMatch[1]!;
      conversationRequests.push(threadId);
      if (threadId === 'thread-1') await firstConversationGate;
      const message = messages.find((item) => item.threadId === threadId)!;
      await route.fulfill({
        json: {
          messages: [
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
              body: [message.preview],
              attachments: [],
            },
          ],
        },
      });
      return;
    }

    const statusMatch = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/messages/(message-[12])/status$`)
    );
    if (method === 'PATCH' && statusMatch) {
      const messageId = statusMatch[1]!;
      statusRequests.push(messageId);
      if (messageId === 'message-1') await firstStatusGate;
      const payload = request.postDataJSON() as { unread?: boolean };
      unreadById.set(messageId, payload.unread ?? unreadById.get(messageId) ?? false);
      await route.fulfill({ json: { data: { updated: true } } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return {
    getConversationRequests: () => conversationRequests,
    getStatusRequests: () => statusRequests,
    getMessagesFetches: () => messagesFetches,
    getUnread: (messageId: string) => unreadById.get(messageId),
    releaseFirstConversation: () => releaseFirstConversationRequest?.(),
    releaseFirstStatus: () => releaseFirstStatusRequest?.(),
  };
}

test('keeps rapidly opened messages read while status requests settle', async ({ page }) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');

  await expect.poll(() => api.getConversationRequests()).toEqual(['thread-1']);
  await expect(
    page.getByRole('button', { name: 'First Client: First unread, read', exact: true })
  ).toBeVisible();
  expect(api.getStatusRequests()).toEqual([]);

  await page
    .getByRole('button', { name: 'Second Client: Second unread, unread', exact: true })
    .click();

  await expect.poll(() => api.getStatusRequests()).toEqual(['message-2']);
  await expect(
    page.getByRole('button', { name: 'First Client: First unread, read', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Second Client: Second unread, read', exact: true })
  ).toBeVisible();
  expect(api.getMessagesFetches()).toBe(1);

  api.releaseFirstConversation();
  await expect.poll(() => api.getStatusRequests()).toEqual(['message-2', 'message-1']);
  api.releaseFirstStatus();
  await expect.poll(() => api.getUnread('message-1')).toBe(false);
  await expect.poll(() => api.getUnread('message-2')).toBe(false);
});
