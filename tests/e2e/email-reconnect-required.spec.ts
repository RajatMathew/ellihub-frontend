import { expect, test, type Page } from '@playwright/test';

type Provider = 'gmail' | 'outlook';

const ACCOUNT_ID = 'account-reconnect';

async function setupReconnectFailure(page: Page, provider: Provider, persisted = false) {
  let messageRequests = 0;
  let syncRequests = 0;

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
      await route.fulfill({
        json: {
          data: [
            {
              id: ACCOUNT_ID,
              slug: `${provider}-account`,
              email: `${provider}@example.com`,
              mailboxAddress: `${provider}@example.com`,
              displayName: `${provider} account`,
              provider,
              status: persisted ? 'ERROR' : 'CONNECTED',
              lastSyncedAt: '2026-07-28T08:00:00.000Z',
              connectedById: 'user-admin',
              freshness: {
                state: persisted ? 'error' : 'stale',
                lastSyncedAt: '2026-07-28T08:00:00.000Z',
                staleSince: '2026-07-28T08:00:00.000Z',
                reason: persisted
                  ? 'The email provider authorization is no longer valid.'
                  : 'Mailbox data needs a provider refresh.',
                errorCode: persisted ? 'EMAIL_RECONNECT_REQUIRED' : null,
                syncing: false,
              },
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
              providerId: 'inbox',
              name: 'Inbox',
              fullName: 'Inbox',
              parentId: null,
              key: 'inbox',
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

    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages`) {
      messageRequests += 1;
      await route.fulfill({
        status: 401,
        json: {
          success: false,
          message: 'The email provider authorization is no longer valid. Reconnect the account.',
          details: { code: 'EMAIL_RECONNECT_REQUIRED' },
        },
      });
      return;
    }

    if (method === 'POST' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/sync`) {
      syncRequests += 1;
      await route.fulfill({
        status: 401,
        json: {
          success: false,
          message: 'The email provider authorization is no longer valid. Reconnect the account.',
          details: { code: 'EMAIL_RECONNECT_REQUIRED' },
        },
      });
      return;
    }

    await route.fulfill({ status: 404, json: { message: `Unhandled route: ${method} ${path}` } });
  });

  return {
    getMessageRequests: () => messageRequests,
    getSyncRequests: () => syncRequests,
  };
}

for (const provider of ['gmail', 'outlook'] as const) {
  test(`${provider} authorization failure stops refetching and shows reconnect recovery`, async ({
    page,
  }) => {
    const api = await setupReconnectFailure(page, provider);

    await page.goto(`/app/email/accounts/${provider}-account`);

    await expect(
      page.getByRole('heading', {
        name: `Reconnect your ${provider === 'outlook' ? 'Outlook' : 'Gmail'} account`,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: `Reconnect ${provider === 'outlook' ? 'Outlook' : 'Gmail'}`,
      })
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/app/email/accounts/${provider}-account$`));

    await page.waitForTimeout(1_500);

    expect(api.getMessageRequests()).toBe(1);
    expect(api.getSyncRequests()).toBe(0);
    await expect(
      page.getByText('The email provider is cooling down after repeated connection failures.')
    ).toHaveCount(0);
  });
}

test('a persisted reconnect state makes no provider requests after an app relaunch', async ({
  page,
}) => {
  const api = await setupReconnectFailure(page, 'outlook', true);

  await page.goto('/app/email/accounts/outlook-account');

  await expect(page.getByRole('heading', { name: 'Reconnect your Outlook account' })).toBeVisible();
  await page.waitForTimeout(1_000);

  expect(api.getMessageRequests()).toBe(0);
  expect(api.getSyncRequests()).toBe(0);
});
