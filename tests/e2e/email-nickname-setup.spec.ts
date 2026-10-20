import { expect, test, type Page } from '@playwright/test';

const ACCOUNT_ID = 'nickname-account';
const ACCOUNT_SLUG = 'nightmare-account';
const CONNECTED_ADDRESS = 'aaryan.narayani@outlook.com';
const LONG_ALIAS = 'aaryan.narayani.with.an.intentionally.long.account.name@ellicorp.com';
const SIDEBAR_ALIAS = 'aaryan.narayani.with.an.intentionally.long.accou@ellicorp.com';

const freshness = {
  state: 'fresh',
  lastSyncedAt: '2026-07-31T10:00:00.000Z',
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

async function setupMockApi(page: Page) {
  const nicknameRequests: string[] = [];
  let account = {
    id: ACCOUNT_ID,
    slug: ACCOUNT_SLUG,
    email: CONNECTED_ADDRESS,
    mailboxAddress: CONNECTED_ADDRESS,
    displayName: LONG_ALIAS,
    nickname: LONG_ALIAS,
    needsNickname: true,
    provider: 'outlook' as const,
    status: 'CONNECTED',
    lastSyncedAt: freshness.lastSyncedAt,
    connectedById: 'user-admin',
    freshness,
  };

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
            permissions: { mail: ['read'] },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts') {
      await route.fulfill({ json: { data: [account] } });
      return;
    }

    if (method === 'PATCH' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/nickname`) {
      const payload = request.postDataJSON() as { nickname: string };
      nicknameRequests.push(payload.nickname);
      const localPart = payload.nickname.trim().toLowerCase().replace(/\s+/g, '.');
      account = {
        ...account,
        displayName: `${localPart}@ellicorp.com`,
        nickname: `${localPart}@ellicorp.com`,
        needsNickname: false,
      };
      await route.fulfill({ json: { data: account } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/folders`) {
      await route.fulfill({
        json: {
          data: [
            {
              id: 'folder-inbox',
              providerId: 'inbox',
              name: 'Inbox',
              fullName: 'Inbox',
              parentId: null,
              key: 'inbox',
              totalCount: 0,
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
      await route.fulfill({
        json: {
          data: {
            records: [],
            nextPageToken: null,
            pageSize: 100,
            totalCount: 0,
            freshness,
          },
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { message: `Unhandled route: ${method} ${path}` } });
  });

  return { nicknameRequests };
}

test('requires first-time nickname setup and contains long account labels', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.setViewportSize({ width: 1440, height: 760 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);

  const dialog = page.getByRole('dialog', { name: 'Name your Elli email' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(`${CONNECTED_ADDRESS} is connected.`)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  await page.mouse.click(1400, 740);
  await expect(dialog).toBeVisible();

  const accountLink = page
    .locator('[data-sidebar-menu="group"] a')
    .filter({ hasText: '@ellicorp.com' })
    .first();
  const accountLabel = accountLink.locator('span').first();
  await expect(accountLabel).toHaveText(SIDEBAR_ALIAS);

  const overflow = await accountLabel.evaluate((label) => {
    const link = label.parentElement;
    const content = link?.closest('[data-slot="accordion-menu-sub-content"]');
    const localPart = label.firstElementChild as HTMLElement | null;
    const suffix = label.lastElementChild as HTMLElement | null;
    if (!link || !content || !localPart || !suffix) {
      throw new Error('Sidebar account structure not found');
    }

    const labelRect = label.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    const styles = window.getComputedStyle(label);
    const localPartRange = document.createRange();
    localPartRange.selectNodeContents(localPart);

    return {
      linkContained: linkRect.right <= contentRect.right + 1,
      labelContained: labelRect.right <= linkRect.right + 1,
      textOverflow: styles.textOverflow,
      overflow: styles.overflow,
      localPartClipped: localPartRange.getBoundingClientRect().width > localPart.clientWidth + 1,
      suffix: suffix.textContent,
      suffixContained: suffix.getBoundingClientRect().right <= linkRect.right + 1,
    };
  });

  expect(overflow).toEqual({
    linkContained: true,
    labelContained: true,
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    localPartClipped: true,
    suffix: '@ellicorp.com',
    suffixContained: true,
  });

  await page.getByLabel('Elli email address').fill('Aaryan');
  await page.getByRole('button', { name: 'Save email name' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(accountLabel).toHaveText('aaryan@ellicorp.com');
  expect(api.nicknameRequests).toEqual(['Aaryan']);

  await page.getByRole('button', { name: `Account actions for ${CONNECTED_ADDRESS}` }).click();
  await page.getByRole('menuitem', { name: 'Change email name' }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();

  await page.getByLabel('Elli email address').fill('Aaryan 2');
  await page.getByRole('button', { name: 'Save email name' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(accountLabel).toHaveText('aaryan.2@ellicorp.com');
  expect(api.nicknameRequests).toEqual(['Aaryan', 'Aaryan 2']);
});
