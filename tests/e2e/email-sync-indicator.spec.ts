import { expect, test, type Page } from '@playwright/test';

const ACCOUNT_ID = 'account-1';
const MESSAGE_ID = 'message-1';
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
  let syncRequests = 0;

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
                id: MESSAGE_ID,
                providerId: 'provider-message-1',
                threadId: null,
                conversationKey: 'conversation-1',
                senderName: 'Client',
                senderEmail: 'client@example.com',
                subject: 'Project update',
                preview: 'Please review this.',
                receivedAt: NOW,
                folderId: 'folder-inbox',
                folder: 'inbox',
                mailbox: ACCOUNT_ID,
                unread: false,
                keywords: [],
                attachmentCount: 0,
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
      path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages/${MESSAGE_ID}`
    ) {
      await route.fulfill({
        json: {
          message: {
            id: MESSAGE_ID,
            providerId: 'provider-message-1',
            threadId: null,
            conversationKey: 'conversation-1',
            senderName: 'Client',
            senderEmail: 'client@example.com',
            subject: 'Project update',
            preview: 'Please review this.',
            receivedAt: NOW,
            folderId: 'folder-inbox',
            folder: 'inbox',
            mailbox: ACCOUNT_ID,
            unread: false,
            keywords: [],
            body: ['Please review this.'],
            attachments: [],
          },
        },
      });
      return;
    }

    if (method === 'POST' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/sync`) {
      syncRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 7_000));
      await route.fulfill({
        json: {
          data: {
            synced: true,
            status: 'ready',
            processed: 0,
            hasMore: false,
            lastSyncedAt: NOW,
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return {
    getSyncRequests: () => syncRequests,
  };
}

test('stops animating a slow email sync while it continues in the background', async ({ page }) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  const refreshButton = page.getByRole('button', { name: 'Refresh emails' });
  await expect(refreshButton).toBeEnabled();

  await refreshButton.click();
  await expect.poll(api.getSyncRequests).toBe(1);
  await expect(refreshButton).toHaveAttribute('aria-busy', 'true');
  await expect(refreshButton.locator('svg')).toHaveClass(/animate-spin/);

  const backgroundSyncButton = page.getByRole('button', {
    name: 'Email sync continues in the background',
  });
  await expect(backgroundSyncButton).toBeVisible({ timeout: 6_000 });
  await expect(backgroundSyncButton.locator('svg')).not.toHaveClass(/animate-spin/);
});
