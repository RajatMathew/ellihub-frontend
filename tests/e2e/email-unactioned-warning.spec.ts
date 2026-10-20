import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1378 — Inbox mail opened and left without an action is called out
 * above the list once it has waited, and stays there until someone acts on it —
 * opening it again is not acting on it.
 */

const ACCOUNT_ID = 'account-1';
const NOW = new Date('2026-10-12T14:00:00.000Z');
// Past the warning's delay, whatever it is set to.
const PAST_THE_DELAY_MS = 6 * 60 * 1000;

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

async function setupMockApi(page: Page) {
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

    const conversation = path.match(
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/thread-(\\d)/messages$`)
    );
    if (method === 'GET' && conversation) {
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

const row = (page: Page, sender: string) =>
  page.getByRole('button', { name: new RegExp(`^${sender}: `) });

/** Opens a thread and waits until it is the one on screen. */
async function openThread(page: Page, sender: string) {
  const thread = threads.find((item) => item.sender === sender)!;
  await row(page, sender).click();
  await expect(page).toHaveURL(new RegExp(`/id/thread-${thread.n}$`));
}

test('an opened Inbox email left without an action is flagged until it is cleared', async ({
  page,
}) => {
  await page.clock.install({ time: NOW });
  await setupMockApi(page);
  await page.goto('/app/email/accounts/mailbox');
  // The account URL redirects into its Inbox; a click before that lands is lost.
  await expect(page).toHaveURL(/\/inbox/);

  // Open three threads in turn and walk away from them. Metro Electric already
  // has a status, so leaving it is not leaving it undone.
  for (const sender of ['Riverside Steel', 'Harbor Glazing', 'Metro Electric', 'Atlas Concrete']) {
    await openThread(page, sender);
  }

  // The open is recorded just after the thread renders; wait for all four
  // before moving the clock, or the last one is stamped after the jump.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          Object.keys(JSON.parse(localStorage.getItem('elli.email.openedThreads') ?? '{}')).length
      )
    )
    .toBe(4);

  const banner = page.getByRole('region', { name: 'Emails opened without an action' });
  // Nothing yet: the delay has not passed.
  await expect(banner).toHaveCount(0);

  await page.clock.fastForward(PAST_THE_DELAY_MS);

  // Atlas Concrete is still open on screen and still counts: reading is not
  // acting. Metro Electric already has a status, so it does not.
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('3 emails need an action');

  await banner.getByRole('button', { name: /Review/ }).click();
  await expect(banner.getByText('Riverside Steel')).toBeVisible();
  await expect(banner.getByText('Harbor Glazing')).toBeVisible();
  await expect(banner.getByText('Atlas Concrete')).toBeVisible();
  await expect(banner.getByText('Metro Electric')).toHaveCount(0);
  // There is no way to wave one away: it leaves only when acted on.
  await expect(banner.getByRole('button', { name: /No action needed/ })).toHaveCount(0);

  // Opening one from the warning does not clear it.
  await banner.getByRole('button', { name: /Riverside Steel/ }).click();
  await expect(page).toHaveURL(/\/id\/thread-1$/);
  await expect(banner).toContainText('3 emails need an action');
  await expect(banner.getByText('Riverside Steel')).toBeVisible();

  // Nor does a reload.
  await page.reload();
  await expect(banner).toContainText('3 emails need an action');
});
