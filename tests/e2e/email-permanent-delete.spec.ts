import { expect, test, type Page } from '@playwright/test';

const ACCOUNT_ID = 'account-1';
const MESSAGE_ID = 'message-1';
const NOW = '2026-07-24T10:00:00.000Z';

const freshness = {
  state: 'fresh',
  lastSyncedAt: NOW,
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

async function setupMockApi(page: Page) {
  let permanentlyDeleted = false;
  let permanentDeleteRequests = 0;

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
              totalCount: 0,
              unreadCount: 0,
            },
            {
              id: 'folder-deleted',
              providerId: 'TRASH',
              name: 'Deleted Items',
              fullName: 'Deleted Items',
              key: 'deleted',
              totalCount: permanentlyDeleted ? 0 : 1,
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
      const isDeletedFolder = url.searchParams.get('folderKey') === 'deleted';
      await route.fulfill({
        json: {
          data: {
            records:
              isDeletedFolder && !permanentlyDeleted
                ? [
                    {
                      id: MESSAGE_ID,
                      providerId: 'provider-message-1',
                      threadId: null,
                      conversationKey: 'conversation-1',
                      senderName: 'Akash P',
                      senderEmail: 'akash@example.com',
                      subject: 'Invoice attachment',
                      preview: 'Please review the attached invoice.',
                      receivedAt: NOW,
                      folderId: 'folder-deleted',
                      folder: 'deleted',
                      mailbox: ACCOUNT_ID,
                      unread: false,
                      keywords: [],
                      attachmentCount: 0,
                    },
                  ]
                : [],
            nextPageToken: null,
            pageSize: 100,
            totalCount: isDeletedFolder && !permanentlyDeleted ? 1 : 0,
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
            senderName: 'Akash P',
            senderEmail: 'akash@example.com',
            subject: 'Invoice attachment',
            preview: 'Please review the attached invoice.',
            receivedAt: NOW,
            folderId: 'folder-deleted',
            folder: 'deleted',
            mailbox: ACCOUNT_ID,
            unread: false,
            keywords: [],
            body: ['Please review the attached invoice.'],
            attachments: [],
          },
        },
      });
      return;
    }

    if (
      method === 'DELETE' &&
      path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages/${MESSAGE_ID}/permanent`
    ) {
      permanentDeleteRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 150));
      permanentlyDeleted = true;
      await route.fulfill({ json: { data: { permanentlyDeleted: true } } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return {
    getPermanentDeleteRequests: () => permanentDeleteRequests,
  };
}

test('confirms and permanently deletes an email only from Deleted Items', async ({ page }) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  await page
    .getByRole('button', { name: /Deleted Items/ })
    .first()
    .click();

  const permanentDeleteButton = page.getByRole('button', { name: 'Delete permanently' });
  await expect(permanentDeleteButton).toBeVisible();
  await permanentDeleteButton.click();

  await expect(page.getByRole('heading', { name: 'Permanently delete this email?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect.poll(api.getPermanentDeleteRequests).toBe(0);

  await permanentDeleteButton.click();
  const confirmButton = page.getByRole('button', { name: 'Delete permanently' }).last();
  await confirmButton.click();

  await expect(page.getByRole('button', { name: 'Deleting…' })).toHaveAttribute(
    'aria-busy',
    'true'
  );
  await expect.poll(api.getPermanentDeleteRequests).toBe(1);
  await expect(page.getByRole('heading', { name: 'Permanently delete this email?' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Select an email' })).toBeVisible();
});
