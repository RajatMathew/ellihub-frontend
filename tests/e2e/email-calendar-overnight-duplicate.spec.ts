import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1260, in the calendar's week view:
 *
 * - An event running past midnight shows on both days it covers. It used to be
 *   drawn on its start day only, cut off at midnight.
 * - Duplicate opens the copy for review, description and attendees included,
 *   instead of creating a stripped-down copy on the spot. Nothing is written
 *   until Save.
 */
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

const CALENDAR = {
  id: 'calendar-1',
  name: 'Calendar',
  isPrimary: true,
  readOnly: false,
  selected: true,
  hidden: false,
};

const SELECTION = {
  aurinkoCalendarId: 'calendar-1',
  name: 'Calendar',
  color: null,
  isPrimary: true,
  hidden: false,
};

// Monday Oct 5, 10 pm to Tuesday Oct 6, 6 am, New York time.
const NIGHT_POUR = {
  id: 'event-night-pour',
  calendarId: 'calendar-1',
  subject: 'Night pour',
  description: 'Slab pour, level 3. Pump truck at 9:30.',
  start: '2026-10-06T02:00:00.000Z',
  end: '2026-10-06T10:00:00.000Z',
  isAllDay: false,
  location: 'PS 105X',
  organizer: { name: 'Mailbox', email: 'mailbox@example.com' },
  attendees: [{ email: 'foreman@example.com', name: 'Site Foreman' }],
  webLink: null,
  done: false,
  doneAt: null,
};

async function setupMockApi(page: Page, writes: string[]) {
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
              provider: 'outlook',
              calendarAccess: 'granted',
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

    const calendarBase = `/api/v1/email/calendars/${ACCOUNT_ID}`;
    if (method === 'GET' && path === calendarBase) {
      await route.fulfill({ json: { data: [CALENDAR] } });
      return;
    }
    if (method === 'GET' && path === `${calendarBase}/selection`) {
      await route.fulfill({ json: { data: [SELECTION] } });
      return;
    }
    if (method === 'GET' && path === `${calendarBase}/events`) {
      await route.fulfill({ json: { data: [NIGHT_POUR] } });
      return;
    }
    if (path.startsWith(`${calendarBase}/`) && method !== 'GET') {
      writes.push(`${method} ${path} ${request.postData() ?? ''}`);
      await route.fulfill({ json: { data: NIGHT_POUR } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

async function openWeek(page: Page, writes: string[]) {
  await page.clock.setFixedTime(new Date('2026-10-07T12:00:00-04:00'));
  await setupMockApi(page, writes);
  await page.goto('/app/email/accounts/mailbox/inbox?view=calendar');
  await expect(page.getByText('Night pour', { exact: true }).first()).toBeVisible();
}

test('an overnight event shows on the night it starts and the morning it ends', async ({
  page,
}) => {
  await openWeek(page, []);

  // One card in Monday's column, one in Tuesday's.
  await expect(page.getByText('Night pour', { exact: true })).toHaveCount(2);
});

test('duplicate opens the copy for review and writes nothing until Save', async ({ page }) => {
  const writes: string[] = [];
  await openWeek(page, writes);

  const card = page.getByText('Night pour', { exact: true }).first();
  await card.hover();
  await page.getByRole('button', { name: 'Duplicate' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'New event' })).toBeVisible();
  await expect(dialog.locator('#calendar-event-title')).toHaveValue('Night pour (copy)');
  await expect(dialog.locator('#calendar-event-location')).toHaveValue('PS 105X');
  await expect(dialog.locator('#calendar-event-description')).toHaveValue(
    'Slab pour, level 3. Pump truck at 9:30.'
  );
  await expect(dialog.getByRole('button', { name: 'Remove foreman@example.com' })).toBeVisible();

  // Nothing written while the copy is only open for review.
  expect(writes).toEqual([]);

  await dialog.getByRole('button', { name: 'Create event' }).click();
  await expect.poll(() => writes.length).toBe(1);

  const [write] = writes;
  expect(write).toContain(`POST /api/v1/email/calendars/${ACCOUNT_ID}/events`);
  const body = JSON.parse(write!.slice(write!.indexOf('{'))) as Record<string, unknown>;
  expect(body).toMatchObject({
    calendarId: 'calendar-1',
    subject: 'Night pour (copy)',
    description: 'Slab pour, level 3. Pump truck at 9:30.',
    location: 'PS 105X',
    attendees: [{ email: 'foreman@example.com', name: 'Site Foreman' }],
  });
  // Still overnight: 10 pm Monday to 6 am Tuesday, not 6 am Monday.
  expect(new Date(body.start as string).toISOString()).toBe('2026-10-06T02:00:00.000Z');
  expect(new Date(body.end as string).toISOString()).toBe('2026-10-06T10:00:00.000Z');
});
