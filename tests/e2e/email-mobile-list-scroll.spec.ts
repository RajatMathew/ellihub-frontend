import { devices, expect, test, type Page } from '@playwright/test';

/**
 * The mail list on a phone.
 *
 * - Coming back from an open message left the list somewhere else. It was
 *   hidden with `display: none`, which dropped its scroll offset to 0 and had
 *   every row it was measuring report a height of 0; on the way back it
 *   re-measured and settled 128px off (in both Chromium and WebKit).
 * - Paging asked for the next page only when the load-more marker crossed
 *   into view, so a page that landed without pushing it back off screen was
 *   the last one ever asked for.
 */
test.describe.configure({ timeout: 60_000 });

const { defaultBrowserType: _defaultBrowserType, ...iphone } = devices['iPhone 13'];
test.use(iphone);

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

const messages = Array.from({ length: 40 }, (_, index) => ({
  id: `message-${index + 1}`,
  threadId: `thread-${index + 1}`,
  senderName: `Sender ${index + 1}`,
  senderEmail: `sender${index + 1}@example.com`,
  subject: `Message ${index + 1}`,
  preview: `Preview ${index + 1}`,
  receivedAt: new Date(Date.UTC(2026, 6, 31, 10) - index * 3600_000).toISOString(),
}));

/**
 * How long each request for page one waits before answering, in call order —
 * a slow refresh of page one, the way a syncing folder's list behaves.
 */
let firstPageDelays: number[] = [];
let firstPageCalls = 0;

async function setupMockApi(page: Page, pageSizes: number[]) {
  firstPageCalls = 0;
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
      const token = new URL(request.url()).searchParams.get('pageToken');
      if (!token) {
        const delay = firstPageDelays[firstPageCalls] ?? 0;
        firstPageCalls += 1;
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const pageIndex = token ? Number(token.replace('page-', '')) - 1 : 0;
      const offset = pageSizes.slice(0, pageIndex).reduce((sum, size) => sum + size, 0);
      const records = Array.from({ length: pageSizes[pageIndex] ?? 0 }, (_, i) => {
        const n = offset + i + 1;
        return {
          id: `message-${n}`,
          threadId: `thread-${n}`,
          senderName: `Sender ${n}`,
          senderEmail: `s${n}@example.com`,
          subject: `Message ${n}`,
          preview: `Preview ${n}`,
          receivedAt: new Date(Date.UTC(2026, 6, 31, 10) - n * 3600_000).toISOString(),
          providerId: `provider-${n}`,
          conversationKey: `thread-${n}`,
          folderId: 'folder-inbox',
          folder: 'inbox',
          mailbox: ACCOUNT_ID,
          unread: false,
          keywords: [],
          attachmentCount: 0,
          threadMessageCount: 1,
        };
      });
      await route.fulfill({
        json: {
          data: {
            records,
            nextPageToken: pageIndex < pageSizes.length - 1 ? `page-${pageIndex + 2}` : null,
            pageSize: 40,
            totalCount: null,
            freshness,
          },
        },
      });
      return;
    }

    const conversationMatch = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/(thread-\\d+)/messages$`)
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
              body: [Array.from({ length: 80 }, (_, i) => `<p>Body line ${i + 1}</p>`).join('')],
              attachments: [],
            },
          ],
        },
      });
      return;
    }

    // The "Sync this mailbox" button: a sync that landed mail, so the list's
    // page one is refreshed.
    if (method === 'POST' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/sync`) {
      await route.fulfill({
        json: {
          data: { synced: true, status: 'ready', processed: 1, hasMore: false, lastSyncedAt: null },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

const list = (page: Page) => page.locator('.mail-rows');

function trackPages(page: Page): string[] {
  const pages: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.endsWith(`/accounts/${ACCOUNT_ID}/messages`)) {
      pages.push(url.searchParams.get('pageToken') ?? 'first');
    }
  });
  return pages;
}

test('coming back from a message keeps the list where it was', async ({ page }) => {
  await setupMockApi(page, [40]);
  await page.goto('/app/email/accounts/mailbox');
  await page.getByRole('button', { name: /Sender 1: Message 1/ }).waitFor();

  await list(page).evaluate((element) => element.scrollTo(0, 1200));
  const before = await list(page).evaluate((element) => element.scrollTop);

  // Open the row in the middle of the screen, as a thumb would.
  const box = (await list(page).boundingBox())!;
  const middle = box.y + box.height / 2;
  const rows = page.getByRole('button', { name: /Sender \d+: Message \d+/ });
  for (let index = 0; index < (await rows.count()); index += 1) {
    const row = await rows.nth(index).boundingBox();
    if (row && row.y < middle && row.y + row.height > middle) {
      await rows.nth(index).click();
      break;
    }
  }

  // Read down the message, then go back.
  const back = page.getByRole('button', { name: /back to email list/i }).first();
  await expect(back).toBeVisible();
  await page.evaluate(() =>
    document
      .querySelectorAll<HTMLElement>('.mail-pane-scroll')
      .forEach((pane) => pane.scrollBy(0, 600))
  );
  await back.click();

  await expect(list(page)).toBeVisible();
  await expect.poll(() => list(page).evaluate((element) => element.scrollTop)).toBe(before);
});

test('keeps paging when a page lands without pushing the end off screen', async ({ page }) => {
  // Three one-email pages: together they do not fill the phone, so the end of
  // the list never leaves the screen and never crosses back into it.
  const pages = trackPages(page);
  await setupMockApi(page, [1, 1, 1, 40]);
  await page.goto('/app/email/accounts/mailbox');

  await expect.poll(() => pages).toEqual(['first', 'page-2', 'page-3', 'page-4']);
  await expect(page.getByRole('button', { name: /Sender 4: Message 4/ })).toBeAttached();
});

test('pages on as the list is scrolled, once per page', async ({ page }) => {
  const pages = trackPages(page);
  await setupMockApi(page, [40, 40, 40]);
  await page.goto('/app/email/accounts/mailbox');
  await page.getByRole('button', { name: /Sender 1: Message 1/ }).waitFor();

  for (let step = 0; step < 40 && pages.length < 3; step += 1) {
    await list(page).evaluate((element) => element.scrollBy(0, 500));
    await page.waitForTimeout(100);
  }

  await expect.poll(() => pages).toEqual(['first', 'page-2', 'page-3']);
});

test('keeps paging when the end comes into view during a refresh of page one', async ({ page }) => {
  // procurement@'s Northway Industries on prod: the folder was syncing, so
  // page one was refreshed every few seconds. Reaching the end during one of
  // those refreshes joined it instead of asking for page two; the refresh came
  // back with the same rows, so nothing changed and nothing asked again.
  firstPageDelays = [0, 3_000];
  const pages = trackPages(page);
  await setupMockApi(page, [40, 40]);
  await page.goto('/app/email/accounts/mailbox');
  await page.getByRole('button', { name: /Sender 1: Message 1/ }).waitFor();

  await page.getByRole('button', { name: 'Sync this mailbox' }).click();
  await expect.poll(() => firstPageCalls).toBe(2);
  // Reach the end while that refresh is still out.
  await list(page).evaluate((element) => element.scrollTo(0, element.scrollHeight));

  await expect.poll(() => pages.includes('page-2'), { timeout: 10_000 }).toBe(true);
  firstPageDelays = [];
});
