import { expect, test, type Page } from '@playwright/test';

const ACCOUNT_ID = 'account-1';
const ORIGINAL_MESSAGE_ID = 'cached-original-message';
const THREAD_ID = 'provider-thread-1';
const NOW = '2026-07-25T10:00:00.000Z';
const DRAFT_CACHE_ID = 'cached-draft-message';
const DRAFT_MESSAGE_ID = 'provider-draft-message-1';
const DRAFT_ID = 'provider-draft-1';

const freshness = {
  state: 'fresh',
  lastSyncedAt: NOW,
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

async function setupMockApi(
  page: Page,
  options: {
    holdDraftSend?: boolean;
    messageHasAttachment?: boolean;
    includeSecondMessage?: boolean;
  } = {}
) {
  const replyMessageIds: string[] = [];
  let draftSaveRequests = 0;
  let draftSendRequests = 0;
  let draftDiscardRequests = 0;
  let draftWasSent = false;
  const draftSavePayloads: Array<Record<string, unknown>> = [];
  let releaseDraftSendRequest: (() => void) | undefined;
  const draftSendGate = options.holdDraftSend
    ? new Promise<void>((resolve) => {
        releaseDraftSendRequest = resolve;
      })
    : Promise.resolve();

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
            {
              id: 'folder-drafts',
              providerId: 'DRAFTS',
              name: 'Drafts',
              fullName: 'Drafts',
              key: 'drafts',
              totalCount: draftWasSent ? 0 : 1,
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
      const isDraftFolder =
        url.searchParams.get('folderKey') === 'drafts' ||
        url.searchParams.get('folderId') === 'folder-drafts';
      await route.fulfill({
        json: {
          data: {
            records: isDraftFolder
              ? draftWasSent
                ? []
                : [createDraftMessage()]
              : [
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
                    threadMessageCount: options.includeSecondMessage ? 2 : 1,
                  },
                ],
            nextPageToken: null,
            pageSize: 100,
            totalCount: isDraftFolder ? (draftWasSent ? 0 : 1) : 1,
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
              attachments: options.messageHasAttachment
                ? [
                    {
                      id: 'cached-attachment-1',
                      providerId: 'provider-attachment-1',
                      name: 'project-brief.pdf',
                      size: '24 KB',
                      sizeBytes: 24_576,
                      mimeType: 'application/pdf',
                    },
                  ]
                : [],
            },
            ...(options.includeSecondMessage
              ? [
                  {
                    id: 'cached-second-message',
                    providerId: 'provider-second-message',
                    senderName: 'Mailbox',
                    senderEmail: 'mailbox@example.com',
                    recipientName: 'Client',
                    recipientEmail: 'client@example.com',
                    to: [{ name: 'Client', address: 'client@example.com' }],
                    cc: [],
                    bcc: [],
                    sentAt: '2026-07-25T10:01:00.000Z',
                    folderId: 'folder-sent',
                    keywords: [],
                    body: ['Here is the follow-up.'],
                    attachments: [],
                  },
                ]
              : []),
          ],
        },
      });
      return;
    }

    if (
      method === 'GET' &&
      path === `/api/v1/email/accounts/${ACCOUNT_ID}/drafts/${DRAFT_CACHE_ID}`
    ) {
      await route.fulfill({
        json: {
          data: {
            draftId: DRAFT_ID,
            messageId: DRAFT_MESSAGE_ID,
            message: createDraftMessage(),
          },
        },
      });
      return;
    }

    if (
      (method === 'POST' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/drafts`) ||
      (method === 'PUT' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/drafts/${DRAFT_ID}`)
    ) {
      draftSaveRequests += 1;
      const payload = request.postDataJSON() as Record<string, unknown>;
      draftSavePayloads.push(payload);
      const attachments = (Array.isArray(payload.attachments) ? payload.attachments : []) as Array<{
        name?: string;
        mimeType?: string;
      }>;
      await route.fulfill({
        json: {
          data: {
            draftId: DRAFT_ID,
            messageId: DRAFT_MESSAGE_ID,
            message: createDraftMessage(
              attachments.map((attachment, index) => ({
                id: `cached-attachment-${index + 1}`,
                providerId: `provider-attachment-${index + 1}`,
                name: attachment.name ?? `attachment-${index + 1}`,
                mimeType: attachment.mimeType,
              }))
            ),
          },
        },
      });
      return;
    }

    if (
      method === 'POST' &&
      path === `/api/v1/email/accounts/${ACCOUNT_ID}/drafts/${DRAFT_ID}/send`
    ) {
      draftSendRequests += 1;
      await draftSendGate;
      draftWasSent = true;
      await route.fulfill({ json: { data: { sent: true } } });
      return;
    }

    if (method === 'DELETE' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/drafts/${DRAFT_ID}`) {
      draftDiscardRequests += 1;
      await route.fulfill({ json: { data: { deleted: true } } });
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
    getDraftSaveRequests: () => draftSaveRequests,
    getDraftSavePayloads: () => draftSavePayloads,
    getDraftSendRequests: () => draftSendRequests,
    getDraftDiscardRequests: () => draftDiscardRequests,
    releaseDraftSend: () => releaseDraftSendRequest?.(),
  };
}

function createDraftMessage(
  attachments: Array<{
    id: string;
    providerId?: string;
    name: string;
    mimeType?: string;
  }> = []
) {
  return {
    id: DRAFT_CACHE_ID,
    providerId: DRAFT_MESSAGE_ID,
    senderName: 'Mailbox',
    senderEmail: 'mailbox@example.com',
    subject: 'Draft ready',
    preview: 'Ready to send',
    receivedAt: NOW,
    folderId: 'folder-drafts',
    folder: 'drafts',
    mailbox: ACCOUNT_ID,
    unread: false,
    to: [{ address: 'client@example.com' }],
    cc: [],
    bcc: [],
    keywords: [],
    attachmentCount: attachments.length,
    body: ['Ready to send'],
    attachments,
  };
}

test('an immediate second reply targets the first reply real cache id', async ({ page }) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  await expect(page.getByRole('heading', { name: 'Project update' })).toBeVisible();

  const originalMessage = page.getByRole('article').first();
  await originalMessage.getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByPlaceholder('Write your reply...').fill('Reply 1');
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect.poll(() => api.getReplyMessageIds()).toEqual([ORIGINAL_MESSAGE_ID]);
  await expect(page.getByText('Reply 1', { exact: true })).toBeVisible();

  const firstReply = page.getByRole('article').last();
  await firstReply
    .getByRole('button', { name: 'Expand message from Mailbox', exact: true })
    .click();
  await firstReply.getByRole('button', { name: 'Reply', exact: true }).click();
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

test('collapses messages by default and opens them when selected', async ({ page }) => {
  await setupMockApi(page, { includeSecondMessage: true });

  await page.goto('/app/email/accounts/mailbox');

  const message = page.getByRole('article').first();
  const expandButton = message.getByRole('button', {
    name: 'Expand message from Client',
    exact: true,
  });
  await expect(expandButton).toBeVisible();
  await expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  await expect(message.getByRole('button', { name: 'Reply', exact: true })).toHaveCount(0);

  await expandButton.click();
  await expect(message.getByRole('button', { name: 'Reply to Client', exact: true })).toBeVisible();

  await message.getByRole('button', { name: 'Collapse message from Client', exact: true }).click();
  await expect(expandButton).toBeVisible();
});

test('keeps a single-message conversation open', async ({ page }) => {
  await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');

  const message = page.getByRole('article').first();
  await expect(message.getByRole('button', { name: 'Reply', exact: true })).toBeVisible();
  await expect(message.getByRole('button', { name: /Expand message from Client/ })).toHaveCount(0);
  await expect(message.getByRole('button', { name: /Collapse message from Client/ })).toHaveCount(
    0
  );
});

test('keeps a message with an attachment open and does not offer collapse', async ({ page }) => {
  await setupMockApi(page, { messageHasAttachment: true, includeSecondMessage: true });

  await page.goto('/app/email/accounts/mailbox');

  const message = page.getByRole('article').first();
  await expect(message.getByText('project-brief.pdf', { exact: true })).toBeVisible();
  await expect(message.getByRole('button', { name: 'Reply to Client', exact: true })).toBeVisible();
  await expect(message.getByRole('button', { name: /Expand message from Client/ })).toHaveCount(0);
  await expect(message.getByRole('button', { name: /Collapse message from Client/ })).toHaveCount(
    0
  );
});

test('does not autosave while composing and saves once when an unsent email is closed', async ({
  page,
}) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  await page.getByRole('button', { name: 'New email' }).click();
  await page.getByPlaceholder('Add a subject').fill('Quarterly update');

  await page.waitForTimeout(1_600);
  expect(api.getDraftSaveRequests()).toBe(0);

  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

  await expect.poll(() => api.getDraftSaveRequests()).toBe(1);
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('closes an unfinished new email without saving it as a draft', async ({ page }) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  await page.getByRole('button', { name: 'New email' }).click();
  await page.getByPlaceholder('recipient@example.com').fill('someone@outlook');
  await page.getByPlaceholder('Add a subject').fill('Quarterly update');

  await page.waitForTimeout(1_600);
  expect(api.getDraftSaveRequests()).toBe(0);

  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  expect(api.getDraftSaveRequests()).toBe(0);
  expect(api.getDraftDiscardRequests()).toBe(0);
});

test('removes a sent draft from the Drafts list before the send request finishes', async ({
  page,
}) => {
  const api = await setupMockApi(page, { holdDraftSend: true });

  await page.goto('/app/email/accounts/mailbox');
  await page
    .getByRole('button', { name: /^Drafts/ })
    .first()
    .click();

  const draftRow = page.getByRole('button', { name: /Mailbox: Draft ready/ });
  await expect(draftRow).toBeVisible();
  await draftRow.click();
  await page.getByRole('dialog').getByRole('button', { name: 'Send', exact: true }).click();

  await expect.poll(() => api.getDraftSendRequests()).toBe(1);
  await expect(draftRow).toBeHidden();

  api.releaseDraftSend();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('prepares and uploads an attachment immediately without validating partial recipients', async ({
  page,
}) => {
  const api = await setupMockApi(page);

  await page.goto('/app/email/accounts/mailbox');
  await page.getByRole('button', { name: 'New email' }).click();
  await page.getByPlaceholder('recipient@example.com').fill('someone@outlook');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'proposal.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Proposal'),
  });

  await expect.poll(() => api.getDraftSaveRequests()).toBe(1);
  const [payload] = api.getDraftSavePayloads();
  expect(payload?.to).toEqual([]);
  expect(payload?.attachments).toEqual([
    expect.objectContaining({ name: 'proposal.txt', mimeType: 'text/plain' }),
  ]);
  await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  await expect(page.getByText(/invalid email/i)).toHaveCount(0);

  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect.poll(() => api.getDraftDiscardRequests()).toBe(1);
});
