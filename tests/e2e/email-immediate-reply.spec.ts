import { expect, test, type Page } from '@playwright/test';

const ACCOUNT_ID = 'account-1';
const ORIGINAL_MESSAGE_ID = 'cached-original-message';
const THREAD_ID = 'provider-thread-1';
const NOW = '2026-07-25T10:00:00.000Z';

const freshness = {
  state: 'fresh',
  lastSyncedAt: NOW,
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

async function setupMockApi(page: Page) {
  const replyMessageIds: string[] = [];

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
            records: [
              {
                id: ORIGINAL_MESSAGE_ID,
                providerId: 'provider-original-message',
                threadId: THREAD_ID,
                conversationKey: THREAD_ID,
                senderName: 'Client',
                senderEmail: 'client@example.com',
                subject: 'Project update',
                preview: 'Can you review this?',
                receivedAt: NOW,
                folderId: 'folder-inbox',
                folder: 'inbox',
                mailbox: ACCOUNT_ID,
                unread: false,
                keywords: [],
                attachmentCount: 0,
                threadMessageCount: 1,
              },
            ],
            nextPageToken: null,
            pageSize: 100,
            totalCount: 1,
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
      await route.fulfill({
        json: {
          messages: [
            {
              id: ORIGINAL_MESSAGE_ID,
              providerId: 'provider-original-message',
              senderName: 'Client',
              senderEmail: 'client@example.com',
              recipientName: 'Mailbox',
              recipientEmail: 'mailbox@example.com',
              to: [{ name: 'Mailbox', address: 'mailbox@example.com' }],
              cc: [
                { name: 'Project Manager', address: 'project.manager@example.com' },
                { address: 'accounts@example.com' },
              ],
              bcc: [{ name: 'Project Archive', address: 'archive@example.com' }],
              sentAt: NOW,
              folderId: 'folder-inbox',
              keywords: [],
              body: ['Can you review this?'],
              attachments: [],
            },
          ],
        },
      });
      return;
    }

    const replyMatch = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/messages/([^/]+)/reply$`)
    );
    if (method === 'POST' && replyMatch) {
      const targetMessageId = decodeURIComponent(replyMatch[1] ?? '');
      replyMessageIds.push(targetMessageId);
      const replyNumber = replyMessageIds.length;

      await route.fulfill({
        json: {
          data: {
            status: 'Ok',
            id: `provider-reply-${replyNumber}`,
            threadId: THREAD_ID,
            message: {
              id: `cached-reply-${replyNumber}`,
              providerId: `provider-reply-${replyNumber}`,
              senderName: 'Mailbox',
              senderEmail: 'mailbox@example.com',
              recipientName: 'Client',
              recipientEmail: 'client@example.com',
              sentAt: `2026-07-25T10:0${replyNumber}:00.000Z`,
              folderId: 'folder-sent',
              keywords: [],
              body: [`Reply ${replyNumber}`],
              attachments: [],
            },
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return {
    getReplyMessageIds: () => replyMessageIds,
  };
}

test('an immediate second reply targets the first reply real cache id', async ({ page }) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  await expect(page.getByRole('heading', { name: 'Project update' })).toBeVisible();

  await page.getByRole('article').getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByPlaceholder('Write your reply...').fill('Reply 1');
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect.poll(() => api.getReplyMessageIds()).toEqual([ORIGINAL_MESSAGE_ID]);
  await expect(page.getByText('Reply 1', { exact: true })).toBeVisible();

  await page.getByRole('article').getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByPlaceholder('Write your reply...').fill('Reply 2');
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect
    .poll(() => api.getReplyMessageIds())
    .toEqual([ORIGINAL_MESSAGE_ID, 'cached-reply-1']);
  await expect(page.getByText('Reply 2', { exact: true })).toBeVisible();
});

test('shows Cc and Bcc recipients in the message header and recipient details', async ({
  page,
}) => {
  await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');

  const message = page.getByRole('article').first();
  await expect(message.getByText('Cc:', { exact: true })).toBeVisible();
  await expect(message.getByText('Bcc:', { exact: true })).toBeVisible();

  await message.getByRole('button', { name: /View message recipients/ }).click();

  await expect(page.getByText('Message recipients', { exact: true })).toBeVisible();
  await expect(page.getByText('project.manager@example.com', { exact: true })).toBeVisible();
  await expect(page.getByText('accounts@example.com', { exact: true })).toBeVisible();
  await expect(page.getByText('archive@example.com', { exact: true })).toBeVisible();
  await expect(page.getByText('Hidden from other recipients', { exact: true })).toBeVisible();
});
