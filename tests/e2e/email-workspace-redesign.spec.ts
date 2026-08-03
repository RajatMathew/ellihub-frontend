import { expect, test, type Page } from '@playwright/test';

const ACCOUNT_ID = 'workspace-account';
const NOW = '2026-08-03T10:00:00.000Z';
const freshness = {
  state: 'fresh',
  lastSyncedAt: NOW,
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

async function setupMockApi(page: Page, options: { holdMessageDetail?: boolean } = {}) {
  let releaseMessageDetail = () => {};
  const messageDetailGate = new Promise<void>((resolve) => {
    releaseMessageDetail = resolve;
  });

  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-1', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'user-1', name: 'Admin User', email: 'admin@elli.com' },
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
              slug: 'workspace',
              email: 'workspace@example.com',
              mailboxAddress: 'workspace@example.com',
              displayName: 'Workspace',
              nickname: 'Workspace',
              needsNickname: false,
              provider: 'gmail',
              calendarAccess: 'granted',
              status: 'CONNECTED',
              lastSyncedAt: NOW,
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
              parentId: null,
              key: 'inbox',
              totalCount: 1,
              unreadCount: 1,
            },
            {
              id: 'folder-sent',
              providerId: 'SENT',
              name: 'Sent Items',
              fullName: 'Sent Items',
              parentId: null,
              key: 'sent',
              totalCount: 0,
              unreadCount: 0,
            },
            {
              id: 'folder-archive',
              providerId: 'ARCHIVE',
              name: 'Archive',
              fullName: 'Archive',
              parentId: null,
              key: 'archive',
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

    const message = {
      id: 'message-1',
      providerId: 'provider-message-1',
      threadId: null,
      senderName: 'Brooklyn Solid Surface',
      senderEmail: 'ap@brooklyn.example',
      subject: 'Invoice #10488 — Corian tops for Hollis Library',
      preview: 'Attached is our invoice for the solid-surface tops shipped this week.',
      receivedAt: NOW,
      folderId: 'folder-inbox',
      folder: 'inbox',
      mailbox: ACCOUNT_ID,
      unread: true,
      keywords: ['Hollis Library'],
      attachmentCount: 1,
      threadMessageCount: 1,
      body: ['<p>Attached is our invoice for the solid-surface tops shipped this week.</p>'],
      attachments: [],
    };

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages`) {
      await route.fulfill({
        json: {
          data: {
            records: [message],
            nextPageToken: null,
            pageSize: 100,
            totalCount: 1,
            freshness,
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages/message-1`) {
      if (options.holdMessageDetail) await messageDetailGate;
      await route.fulfill({ json: { message } });
      return;
    }

    if (
      method === 'PATCH' &&
      path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages/message-1/status`
    ) {
      await route.fulfill({ json: { data: { updated: true } } });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });

  return { releaseMessageDetail };
}

test('renders the redesigned live mailbox and workspace tabs', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const { releaseMessageDetail } = await setupMockApi(page, { holdMessageDetail: true });
  await page.goto('/app/email/accounts/workspace');

  const mailboxHeading = page.getByRole('heading', { name: 'Workspace' });
  await expect(mailboxHeading).toBeVisible();
  await expect(
    mailboxHeading.locator('..').getByText('workspace@example.com', { exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Project emails' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Brooklyn Solid Surface:/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Invoice #10488/ })).toBeVisible();
  releaseMessageDetail();

  const agentButton = page.getByRole('button', { name: 'Open Elli agent' });
  const newButton = page.getByRole('button', { name: 'New' });
  await expect(agentButton).toBeVisible();
  await expect(newButton).toBeVisible();
  const [agentBox, newBox] = await Promise.all([
    agentButton.boundingBox(),
    newButton.boundingBox(),
  ]);
  expect(agentBox).not.toBeNull();
  expect(newBox).not.toBeNull();
  expect(newBox!.width).toBeGreaterThanOrEqual(78);
  expect(newBox!.width).toBeLessThanOrEqual(84);
  expect(agentBox!.y).toBeGreaterThanOrEqual(newBox!.y + newBox!.height);
  await expect
    .poll(() => newButton.evaluate((element) => getComputedStyle(element).cursor))
    .toBe('pointer');

  await expect(page.getByLabel('Keyboard shortcuts')).toContainText(
    /↑↓\s*navigate\s*·\s*R\s*reply\s*·\s*E\s*archive/
  );
  await page.keyboard.press('r');
  await expect(page.getByPlaceholder('Write your reply...')).toBeFocused();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByPlaceholder('Write your reply...')).toBeHidden();

  const search = page.getByRole('textbox', { name: 'Search mail' });
  const searchRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/messages') && url.searchParams.get('search') === 'Invoice';
  });
  await search.fill('Invoice');
  await searchRequest;
  await expect(page.getByRole('button', { name: 'Clear email search' })).toHaveCount(1);

  await agentButton.click();
  await expect(page.getByRole('complementary', { name: 'Elli agent' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Elli agent' }).click();
  await expect(agentButton).toBeFocused();

  await page.getByRole('tab', { name: 'Tasks' }).click();
  await expect(page).toHaveURL(/view=tasks/);
  await expect(page.getByRole('heading', { name: 'Tasks are coming next' })).toBeVisible();

  await page.getByRole('tab', { name: 'Calendar' }).click();
  await expect(page).toHaveURL(/view=calendar/);
  await expect(page.getByRole('heading', { name: 'Calendar is coming next' })).toBeVisible();

  await page.getByRole('tab', { name: 'Mail' }).click();
  await expect(page).not.toHaveURL(/view=/);
  const shortcuts = page.getByLabel('Keyboard shortcuts');
  await expect(shortcuts).toBeVisible();
  await shortcuts.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );

  const archiveRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return request.method() === 'POST' && url.pathname.endsWith('/messages/message-1/archive');
  });
  await page.keyboard.press('e');
  await archiveRequest;
});

test('uses list-to-detail navigation on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 720 });
  await setupMockApi(page);
  await page.goto('/app/email/accounts/workspace');

  const messageButton = page.getByRole('button', { name: /Brooklyn Solid Surface:/ });
  await expect(messageButton).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to email list' })).toBeHidden();

  await messageButton.click();
  await expect(page.getByRole('button', { name: 'Back to email list' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Invoice #10488/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Elli agent' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Back to email list' }).click();
  await expect(messageButton).toBeVisible();

  await page.setViewportSize({ width: 768, height: 720 });
  await expect(page.getByRole('tablist', { name: 'Mailbox workspace' })).toBeVisible();
});

test('uses U to unarchive from the archive folder', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await setupMockApi(page);
  await page.goto('/app/email/accounts/workspace');

  await page.getByRole('button', { name: 'Other' }).click();
  await page.getByRole('menuitem', { name: 'Archive' }).click();

  const shortcuts = page.getByLabel('Keyboard shortcuts');
  await expect(shortcuts).toContainText(/U\s*unarchive/);
  await shortcuts.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  );

  const unarchiveRequest = page.waitForRequest(
    (request) => {
      const url = new URL(request.url());
      return request.method() === 'POST' && url.pathname.endsWith('/messages/message-1/unarchive');
    },
    { timeout: 3_000 }
  );
  await page.keyboard.press('u');
  await unarchiveRequest;
});

test('renders the redesigned shared mailbox shell without fake messages', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await setupMockApi(page);
  await page.goto('/app/email/procurement');

  await expect(page.getByRole('heading', { name: 'procurement@ellicorp.com' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Project emails' })).toBeDisabled();
  await expect(page.getByText('Project emails is empty')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible();
});
