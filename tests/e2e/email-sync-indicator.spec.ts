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
  let draftSaveRequests = 0;
  const draftSendBodies: unknown[] = [];

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
      if (emailSent) {
        postSendMessageRequests += 1;
        await new Promise((resolve) => setTimeout(resolve, 7_000));
      }

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

    if (method === 'POST' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages/send`) {
      sendRequests += 1;
      emailSent = true;
      await route.fulfill({ json: { data: { accepted: true } } });
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

    if (method === 'POST' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/drafts`) {
      draftSaveRequests += 1;
      const payload = request.postDataJSON() as {
        subject: string;
        body: string;
        to: Array<{ address: string }>;
        attachments?: Array<{ name: string; content: string }>;
      };
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.fulfill({
        json: {
          data: {
            draftId: 'draft-provider-1',
            messageId: 'draft-message-1',
            message: {
              id: 'draft-cache-1',
              providerId: 'draft-message-1',
              threadId: null,
              conversationKey: 'draft-message-1',
              senderName: 'Mailbox',
              senderEmail: 'mailbox@example.com',
              subject: payload.subject,
              preview: '',
              receivedAt: NOW,
              folderId: 'folder-drafts',
              folder: 'drafts',
              mailbox: ACCOUNT_ID,
              unread: false,
              to: payload.to,
              body: [payload.body],
              attachments: (payload.attachments ?? []).map((attachment, index) => ({
                id: `attachment-${index + 1}`,
                providerId: `provider-attachment-${index + 1}`,
                name: attachment.name,
                size: '1 KB',
                sizeBytes: 1024,
                mimeType: 'application/octet-stream',
                inline: false,
              })),
            },
          },
        },
      });
      return;
    }

    if (
      method === 'POST' &&
      path === `/api/v1/email/accounts/${ACCOUNT_ID}/drafts/draft-provider-1/send`
    ) {
      draftSendBodies.push(request.postDataJSON());
      await route.fulfill({ json: { data: { sent: true } } });
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
    getDraftSaveRequests: () => draftSaveRequests,
    getDraftSendBodies: () => draftSendBodies,
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

test('prepares an attachment before enabling a lightweight draft send', async ({ page }) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  await page.getByRole('button', { name: 'New email' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'To *', exact: true }).fill('client@example.com');
  await dialog.getByRole('textbox', { name: 'Subject', exact: true }).fill('Prepared attachment');
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'recording.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.alloc(1024, 7),
  });

  const sendButton = dialog.locator('button[type="submit"]');
  await expect(sendButton).toBeDisabled();
  await expect.poll(api.getDraftSaveRequests).toBe(1);
  await expect(page.getByText('Preparing…')).toBeVisible();

  await expect(page.getByText('Ready')).toBeVisible();
  await expect(sendButton).toBeEnabled();
  await sendButton.click();

  await expect.poll(() => api.getDraftSendBodies().length).toBe(1);
  expect(api.getDraftSendBodies()[0]).toEqual({ messageId: 'draft-message-1' });
  await expect(dialog).toBeHidden();
});
