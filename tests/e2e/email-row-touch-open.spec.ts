import { expect, test, type Page } from '@playwright/test';

/**
 * Tapping an email row on a touch device must open the thread (elli-ui#1207).
 *
 * The swipe-to-reveal gesture added in #1206 wraps every row in a `drag="x"`
 * motion element, and `motion` starts a pan as soon as the pointer travels 3px
 * in *any* direction. A real finger tap travels further than that, so the row
 * treated an ordinary tap as a completed drag and swallowed the click. A mouse
 * click reports no movement at all, which is why every desktop-driven check
 * passed while the mailbox was unusable on a phone.
 *
 * So this runs with touch emulation on and dispatches the tap through CDP
 * rather than `page.touchscreen.tap()` — the latter emits touchStart/touchEnd
 * at one exact coordinate, which is the one kind of tap that was never broken.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.describe.configure({ timeout: 60_000 });

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
              body: [message.preview],
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

/** The open thread. On a phone the reading pane replaces the list in place. */
function readingPane(page: Page) {
  return page.getByRole('heading', { name: 'Second message', level: 1 });
}

/**
 * A tap the way a finger actually makes one: it lasts, and it drifts.
 * `page.touchscreen.tap()` cannot express either — it dispatches touchStart
 * and touchEnd at one coordinate in the same instant, which is the one kind of
 * tap that was never broken.
 */
async function fingerTap(page: Page, x: number, y: number, dx: number, dy: number) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, px: number, py: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints:
        type === 'touchEnd' ? [] : [{ x: px, y: py, radiusX: 14, radiusY: 14, force: 1 }],
    });

  await touch('touchStart', x, y);
  await page.waitForTimeout(40);
  for (let step = 1; step <= 4; step += 1) {
    await touch('touchMove', x + (dx * step) / 4, y + (dy * step) / 4);
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(30);
  await touch('touchEnd', x + dx, y + dy);
  await cdp.detach();
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Past half of the four-action drawer (256px), so the distance alone commits
// it open and the test does not lean on how fast CDP happened to deliver the
// moves.
const SWIPE_DISTANCE = 170;

/** A leftward swipe across the row, far enough to commit the drawer open. */
async function swipeRowOpen(page: Page, box: Box) {
  const y = box.y + box.height / 2;
  const startX = box.x + box.width - 20;

  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, px: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: px, y, radiusX: 14, radiusY: 14, force: 1 }],
    });

  await touch('touchStart', startX);
  for (let offset = 10; offset <= SWIPE_DISTANCE; offset += 10) {
    await touch('touchMove', startX - offset);
    await page.waitForTimeout(10);
  }
  await touch('touchEnd', startX - SWIPE_DISTANCE);
  await cdp.detach();
}

/**
 * A button in the revealed drawer. Scoped by its visible caption: the row's own
 * icon button for the same action carries the same accessible name and has no
 * text.
 */
function revealAction(page: Page, verb: string) {
  return page.getByRole('button', { name: `${verb} Second message` }).filter({ hasText: verb });
}

function revealArchive(page: Page) {
  return revealAction(page, 'Archive');
}

async function openMailbox(page: Page) {
  await setupMockApi(page);
  await page.goto('/app/email/accounts/mailbox');
  const row = page.getByRole('button', { name: /Second Client: Second message/ });
  await expect(row).toBeVisible();
  return row;
}

test('opens the thread when the tap lands on the avatar', async ({ page }) => {
  // The hover-reveal checkbox is an `opacity-0` circle on `z-10` above the
  // avatar. Invisible is not intangible, and a touch device never hovers, so
  // it silently ate every tap on the left edge of every row.
  const row = await openMailbox(page);

  const box = (await row.boundingBox())!;
  await fingerTap(page, box.x + 28, box.y + 30, 0, 3);

  await expect(readingPane(page)).toBeVisible();
});

test('opens the thread when a thumb rolls down the glass on the way up', async ({ page }) => {
  // The regression that made the mailbox unusable. A thumb leaving the screen
  // rolls further vertically than horizontally, and this drawer only moves on
  // the x axis — so this gesture moves it by exactly zero and is a tap by any
  // honest reading. Judging it on total 2D travel called it a swipe.
  const row = await openMailbox(page);
  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);

  const box = (await row.boundingBox())!;
  await fingerTap(page, box.x + box.width / 3, box.y + box.height / 2, 0, 14);

  await expect(readingPane(page)).toBeVisible();
});

test('opens the thread when the tap drifts sideways as well', async ({ page }) => {
  const row = await openMailbox(page);

  const box = (await row.boundingBox())!;
  await fingerTap(page, box.x + box.width / 3, box.y + box.height / 2, -12, 4);

  await expect(readingPane(page)).toBeVisible();
});

test('still opens the thread on a perfectly still tap', async ({ page }) => {
  const row = await openMailbox(page);

  const box = (await row.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 4, box.y + box.height / 2);

  await expect(readingPane(page)).toBeVisible();
});

test('does not open the thread when the finger actually swipes the row', async ({ page }) => {
  const row = await openMailbox(page);

  await swipeRowOpen(page, (await row.boundingBox())!);

  await expect(revealArchive(page)).toBeVisible();
  await expect(readingPane(page)).toBeHidden();
});

test('a tap beside an open drawer dismisses it instead of opening the thread', async ({ page }) => {
  const row = await openMailbox(page);

  const box = (await row.boundingBox())!;
  await swipeRowOpen(page, box);

  const archive = revealArchive(page);
  await expect(archive).toBeVisible();

  // Well inside the sliver, clear of the hover-checkbox circle pinned at the
  // row's left edge — that one does not travel with the drawer — and short of
  // the drawer itself, which with four actions leaves about 110px of row.
  await fingerTap(page, box.x + 75, box.y + box.height / 2, 0, 3);

  await expect(readingPane(page)).toBeHidden();
  await expect(archive).toBeHidden();
});

test('a touch row says when the mail arrived, not four icons in its place', async ({ page }) => {
  // The row's icon buttons take the timestamp's place while they are showing.
  // Under a mouse that is on hover; on touch it used to be always, so a phone
  // never showed a single arrival time. The swipe drawer carries the actions
  // there instead.
  const row = await openMailbox(page);

  await expect(row.locator(`[title="${messages[1].receivedAt}"]`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flag Second message' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Archive Second message' })).toBeHidden();
});

test('swiping a row offers flag and pin beside archive and delete', async ({ page }) => {
  const row = await openMailbox(page);

  await swipeRowOpen(page, (await row.boundingBox())!);

  const drawer = ['Flag', 'Pin', 'Archive', 'Delete'].map((verb) => revealAction(page, verb));
  for (const action of drawer) await expect(action).toBeVisible();

  // In that order, Delete outermost.
  const lefts = await Promise.all(drawer.map(async (action) => (await action.boundingBox())!.x));
  expect(lefts).toEqual([...lefts].sort((a, b) => a - b));
});

test('pinning from the drawer pins the thread and closes the drawer', async ({ page }) => {
  const row = await openMailbox(page);

  await swipeRowOpen(page, (await row.boundingBox())!);
  const pin = revealAction(page, 'Pin');
  await expect(pin).toBeVisible();

  const pinRequest = page.waitForRequest(
    (request) => request.method() === 'PUT' && request.url().endsWith('/thread-pin')
  );
  await pin.tap();

  await pinRequest;
  await expect(pin).toBeHidden();
  await expect(readingPane(page)).toBeHidden();
});
