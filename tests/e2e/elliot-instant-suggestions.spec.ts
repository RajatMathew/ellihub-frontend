import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1481 — Elliot's suggestion for a thread appeared only after the panel had loaded the
 * thread's body and then asked the model. Suggestions kept for the message (written when the
 * classifier read it) now show the moment the panel opens.
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

type SuggestCall = { body: Record<string, unknown> };

async function setupMockApi(page: Page, kept: unknown, calls: SuggestCall[]) {
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

    if (path === '/api/v1/mock/agent/suggest/stored') {
      await route.fulfill({ json: { data: { suggestions: kept } } });
      return;
    }
    if (path === '/api/v1/mock/agent/suggest' && method === 'POST') {
      calls.push({ body: request.postDataJSON() as Record<string, unknown> });
      await route.fulfill({
        json: {
          data: { suggestions: [{ key: 'create_po', reason: 'Agreed price, place the order' }] },
        },
      });
      return;
    }
    if (path === '/api/v1/mock/agent/config') {
      await route.fulfill({ json: { data: {} } });
      return;
    }

    const conversation = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/thread-(\\d)/messages$`)
    );
    if (method === 'GET' && conversation) {
      // The thread's body is slow, the way a provider read can be: kept suggestions must not
      // wait for it.
      if (kept !== null) await new Promise((resolve) => setTimeout(resolve, 8000));
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

    await route.fulfill({ json: { data: [] } });
  });
}

async function openElliotOnFirstThread(page: Page) {
  await page.goto('/app/email/accounts/mailbox/inbox/id/thread-1');
  await page.getByText('Elliot', { exact: true }).first().click({ timeout: 60_000 });
}

test.setTimeout(90_000);

test('kept suggestions show as the panel opens, without waiting for the body or the model', async ({
  page,
}) => {
  const calls: SuggestCall[] = [];
  await setupMockApi(page, [{ key: 'create_po', reason: 'PO #26851 issued to vendor' }], calls);
  await openElliotOnFirstThread(page);

  // The body takes 8s to come; the kept suggestion is there long before.
  await expect(page.getByText('PO #26851 issued to vendor')).toBeVisible({ timeout: 3_000 });
  expect(calls).toHaveLength(0);
});

test('with nothing kept, the panel asks once and names the message so the answer is kept', async ({
  page,
}) => {
  const calls: SuggestCall[] = [];
  await setupMockApi(page, null, calls);
  await openElliotOnFirstThread(page);

  await expect(page.getByText('Agreed price, place the order')).toBeVisible({ timeout: 20_000 });
  expect(calls).toHaveLength(1);
  expect(calls[0]!.body).toMatchObject({ accountId: ACCOUNT_ID, messageId: 'message-1' });
});
