import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1184: reading down a long message scrolled its header away.
 *
 * Once a message was expanded past "Show more", the sender, the timestamp and
 * the reply and forward actions went off the top of the pane with the first
 * screen of text. The header now pins to the top of the reading pane for as
 * long as its own message is on screen, the way Show more pins to the bottom.
 */
test.describe.configure({ timeout: 60_000 });

// Tall enough that the expanded body runs several screens past the header.
const LONG_BODY = Array.from(
  { length: 160 },
  (_, index) => `<p>Line ${index + 1} of the quoted chain with the job details.</p>`
).join('');

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
    senderName: 'Scott Vicario',
    senderEmail: 'quote@example.com',
    subject: 'Window sills job quote',
    preview: 'Please send new drawings',
    receivedAt: '2026-07-31T10:00:00.000Z',
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
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/(thread-1)/messages$`)
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
              body: [LONG_BODY],
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

/**
 * Scroll the reading pane — the header's nearest scrolling ancestor — and
 * report where it ended up. Measured rather than assumed: the body grows to
 * full height over a 300ms transition after Show more, and scrolled any
 * earlier the pane only had a few hundred pixels to give.
 */
async function scrollReadingPane(page: Page, anchor: string, by: number) {
  const header = page.getByRole('button', { name: anchor, exact: true });
  const room = () =>
    header.evaluate((element) => {
      let node = element.parentElement;
      while (node) {
        const { overflowY } = getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') {
          return node.scrollHeight - node.clientHeight;
        }
        node = node.parentElement;
      }
      return 0;
    });
  await expect.poll(room).toBeGreaterThan(by);

  return header.evaluate((element, distance) => {
    let node = element.parentElement;
    while (node) {
      const { overflowY } = getComputedStyle(node);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        node.scrollBy(0, distance);
        return node.scrollTop;
      }
      node = node.parentElement;
    }
    throw new Error('No scrolling ancestor for the message header');
  }, by);
}

test('the open message keeps its header on screen while the body scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setupMockApi(page);
  await page.goto('/app/email/accounts/mailbox');

  await page.getByRole('button', { name: /Scott Vicario: Window sills job quote/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Window sills job quote', level: 1 })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Show more' }).click();
  await expect(page.getByRole('button', { name: 'Show less' })).toBeVisible();

  const reply = page.getByRole('button', { name: 'Reply to Scott Vicario', exact: true });
  const before = await reply.boundingBox();
  expect(before).not.toBeNull();

  expect(await scrollReadingPane(page, 'Reply to Scott Vicario', 1500)).toBeGreaterThanOrEqual(
    1500
  );

  // Pinned: still inside the viewport, and no lower than it started — a header
  // that scrolled with the body would now sit 1500px above the viewport.
  await expect(reply).toBeInViewport();
  const after = await reply.boundingBox();
  expect(after!.y).toBeGreaterThanOrEqual(0);
  expect(after!.y).toBeLessThanOrEqual(before!.y);

  // Nothing of the body shows in the band between the toolbar and the pinned
  // header: the toolbar's backdrop fades out across it, and the body used to
  // read through there. Just above the header, the header's own fill is on top
  // and the message frame is underneath it.
  const stack = await reply.evaluate((button) => {
    const header = button.closest('article')!.firstElementChild!;
    const { left, top } = header.getBoundingClientRect();
    const hits = document.elementsFromPoint(left + 40, top - 8);
    return {
      header: hits.indexOf(header),
      frame: hits.findIndex((element) => element.tagName === 'IFRAME'),
    };
  });
  expect(stack.header).toBeGreaterThanOrEqual(0);
  expect(stack.frame === -1 || stack.header < stack.frame).toBe(true);
});
