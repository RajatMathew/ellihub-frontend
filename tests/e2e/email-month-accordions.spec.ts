import { expect, test, type Page } from '@playwright/test';

type Provider = 'gmail' | 'outlook';

const TEST_NOW = new Date('2026-07-25T12:00:00+05:30');

const freshState = {
  state: 'fresh',
  lastSyncedAt: TEST_NOW.toISOString(),
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

function createMessage(id: string, folder: string, subject: string, receivedAt: string) {
  return {
    id,
    threadId: null,
    senderName: `Sender ${id}`,
    senderEmail: `${id}@example.com`,
    subject,
    preview: `Preview for ${subject}`,
    receivedAt,
    folderId: `folder-${folder}`,
    folder,
    mailbox: 'account-1',
    unread: false,
    body: [`<p>Body for ${subject}</p>`],
  };
}

function messagesForFolder(folder: string) {
  if (folder === 'inbox') {
    return [
      createMessage('inbox-today', folder, 'Today inbox subject', '2026-07-25T08:00:00+05:30'),
      createMessage(
        'inbox-this-week',
        folder,
        'This week inbox subject',
        '2026-07-22T10:00:00+05:30'
      ),
      createMessage(
        'inbox-this-month',
        folder,
        'This month inbox subject',
        '2026-07-10T10:00:00+05:30'
      ),
      createMessage('inbox-last', folder, 'Last month inbox subject', '2026-06-10T10:00:00+05:30'),
      createMessage('inbox-older', folder, 'Older inbox subject', '2026-05-10T10:00:00+05:30'),
    ];
  }

  if (folder === 'sent') {
    return [
      createMessage('sent-current', folder, 'Current sent subject', '2026-07-09T10:00:00+05:30'),
      createMessage('sent-last', folder, 'Last month sent subject', '2026-06-09T10:00:00+05:30'),
    ];
  }

  return [createMessage('deleted-current', folder, 'Deleted subject', '2026-07-08T10:00:00+05:30')];
}

async function setupEmailApi(page: Page, provider: Provider) {
  const account = {
    id: 'account-1',
    slug: `${provider}-account`,
    email: `${provider}@example.com`,
    mailboxAddress: `${provider}@example.com`,
    displayName: `${provider} account`,
    provider,
    status: 'connected',
    lastSyncedAt: freshState.lastSyncedAt,
    connectedById: 'user-admin',
    freshness: freshState,
  };
  const folders = [
    { id: 'folder-inbox', providerId: 'inbox', name: 'Inbox', key: 'inbox' },
    { id: 'folder-sent', providerId: 'sent', name: 'Sent Items', key: 'sent' },
    { id: 'folder-deleted', providerId: 'deleted', name: 'Deleted Items', key: 'deleted' },
  ].map((folder) => ({
    ...folder,
    fullName: folder.name,
    parentId: null,
    sysLabel: null,
    isFolder: true,
    isLabel: false,
    totalCount: messagesForFolder(folder.key).length,
    unreadCount: 0,
  }));

  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: {
            id: 'session-1',
            userId: 'user-admin',
            expiresAt: '2026-12-31T00:00:00.000Z',
          },
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
            employeeId: null,
            projectScope: 'all',
            permissions: {},
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts') {
      await route.fulfill({ json: { data: [account] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts/account-1/folders') {
      await route.fulfill({ json: { data: folders } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts/account-1/tags') {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts/account-1/messages') {
      const folder =
        url.searchParams.get('folderKey') ??
        folders.find((item) => item.id === url.searchParams.get('folderId'))?.key ??
        'inbox';
      const records = messagesForFolder(folder);
      await route.fulfill({
        json: {
          data: {
            records,
            nextPageToken: null,
            pageSize: 100,
            totalCount: records.length,
            freshness: freshState,
          },
        },
      });
      return;
    }

    const messageMatch = path.match(/^\/api\/v1\/email\/accounts\/account-1\/messages\/([^/]+)$/);
    if (method === 'GET' && messageMatch) {
      const messageId = messageMatch[1];
      const message = ['inbox', 'sent', 'deleted']
        .flatMap(messagesForFolder)
        .find((item) => item.id === messageId);
      await route.fulfill({ json: { message } });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { message: `Unhandled test API route: ${method} ${path}` },
    });
  });
}

for (const provider of ['gmail', 'outlook'] as const) {
  test(`${provider} Inbox and Sent use independent month accordions`, async ({ page }) => {
    await page.clock.setFixedTime(TEST_NOW);
    await setupEmailApi(page, provider);
    await page.goto(`/app/email/accounts/${provider}-account`);

    const today = page.getByRole('button', { name: /^Today \d+ emails?$/ });
    const thisWeek = page.getByRole('button', { name: /^This week \d+ emails?$/ });
    const thisMonth = page.getByRole('button', { name: /^This month \d+ emails?$/ });
    const lastMonth = page.getByRole('button', { name: /^Last month \d+ emails?$/ });
    const todayInbox = page.getByRole('button', { name: /Today inbox subject/ });
    const lastMonthInbox = page.getByRole('button', { name: /Last month inbox subject/ });

    await expect(today).toHaveAttribute('aria-expanded', 'true');
    await expect(thisWeek).toHaveAttribute('aria-expanded', 'true');
    await expect(thisMonth).toHaveAttribute('aria-expanded', 'true');
    await expect(lastMonth).toHaveAttribute('aria-expanded', 'true');
    await expect(todayInbox).toBeVisible();
    await expect(lastMonthInbox).toBeVisible();

    await today.focus();
    await page.keyboard.press('Enter');
    await expect(today).toHaveAttribute('aria-expanded', 'false');
    await expect(todayInbox).toBeHidden();
    await expect(lastMonthInbox).toBeVisible();

    await page.keyboard.press('Space');
    await expect(today).toHaveAttribute('aria-expanded', 'true');
    await expect(todayInbox).toBeVisible();

    await page.getByRole('button', { name: 'Sent Items' }).first().click();
    await expect(page.getByRole('heading', { name: 'Sent Items' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^This month \d+ emails?$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Current sent subject/ })).toBeVisible();

    await page.getByRole('button', { name: 'Deleted Items' }).first().click();
    await expect(page.getByRole('heading', { name: 'Deleted Items' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^This month \d+ emails?$/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Deleted subject/ })).toBeVisible();
  });
}
