import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1216: opening a reply repainted the whole client in the quoted
 * message's font.
 *
 * The reading pane renders a body inside a sandboxed iframe and deliberately
 * keeps its `<style>`. The reply composer put the same body into the
 * application's own document with `dangerouslySetInnerHTML`, so a stylesheet
 * written for a full page applied to ours — and `!important` on `body`/`div`
 * beat every utility class in the app.
 *
 * This asserts against the computed font of chrome that is nowhere near the
 * composer, because that is the part the reporter actually saw change.
 */
test.describe.configure({ timeout: 60_000 });

const HOSTILE_BODY =
  '<style>body, p, div, td, span, button { font-family: Georgia, "Times New Roman", serif !important; }</style>' +
  '<p>Hi Estuardo,</p><p>Thank you, we will submit the drawings.</p>';

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
    subject: 'First message',
    preview: 'First message body',
    receivedAt: '2026-07-31T10:00:00.000Z',
  },
  {
    id: 'message-2',
    threadId: 'thread-2',
    senderName: 'Second Client',
    senderEmail: 'second@example.com',
    subject: 'Second message',
    preview: 'Second message body',
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
              conversationKey: message.threadId,
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

    const conversationMatch = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/(thread-[12])/messages$`)
    );
    if (method === 'GET' && conversationMatch) {
      const threadId = conversationMatch[1]!;
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
              body: [HOSTILE_BODY],
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

/** The font the app is actually painted in, read off chrome outside the composer. */
async function appFont(page: Page) {
  return page.evaluate(() => {
    const heading =
      document.querySelector('h1, h2, [data-slot="sidebar"] a, nav a') ?? document.body;
    return {
      body: getComputedStyle(document.body).fontFamily,
      chrome: getComputedStyle(heading).fontFamily,
    };
  });
}

test('opening a reply does not repaint the app in the quoted message font', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/app/email/accounts/mailbox');

  const row = page.getByRole('button', { name: /Second Client: Second message/ });
  await expect(row).toBeVisible();
  const before = await appFont(page);
  expect(before.body).not.toContain('Georgia');

  await row.click();
  await expect(page.getByRole('heading', { name: 'Second message', level: 1 })).toBeVisible();

  const reply = page.getByRole('button', { name: /^Reply/ }).first();
  await reply.click();

  // The compact composer says the quote is included but does not render it —
  // full screen is where it enters the document, which is exactly where the
  // reporter saw the font change.
  await page.getByRole('button', { name: 'Full screen' }).first().click();
  await expect(page.getByText('Include quoted text')).toBeVisible();
  await expect(page.getByText('Thank you, we will submit the drawings.')).toBeVisible();

  const after = await appFont(page);
  expect(after.body).not.toContain('Georgia');
  expect(after.chrome).not.toContain('Georgia');
  expect(after.body).toBe(before.body);
  expect(after.chrome).toBe(before.chrome);

  // And the stylesheet itself never reached the document.
  // And the quote block itself carries no stylesheet. Scoped to the quote
  // rather than the document: the app's own sheets live in `head` (the
  // editorial theme names Georgia itself) and dev tooling injects its own.
  const quoted = await page.evaluate(() => {
    const block = document.querySelector('[data-elli-reply-quote]');
    return {
      present: Boolean(block),
      sheets: block?.querySelectorAll('style, link').length ?? -1,
    };
  });
  expect(quoted.present).toBe(true);
  expect(quoted.sheets).toBe(0);
});
