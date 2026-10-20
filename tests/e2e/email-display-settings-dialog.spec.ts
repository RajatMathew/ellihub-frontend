import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1423 — the Email display settings dialog was a narrow beige box with
 * four settings stacked under one another. It is now a wide white settings
 * sheet: settings grouped under section headings, one row per setting, and the
 * same four preferences still working.
 */

test.describe.configure({ timeout: 60_000 });

const ACCOUNT_ID = 'account-1';
const NOW = '2026-10-12T14:00:00.000Z';

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
              lastSyncedAt: NOW,
              connectedById: 'user-1',
              freshness: {
                state: 'fresh',
                lastSyncedAt: NOW,
                staleSince: null,
                reason: null,
                errorCode: null,
                syncing: false,
              },
            },
          ],
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

async function openDisplaySettings(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('vite-theme', 'editorial');
    localStorage.setItem('vite-theme-editorial-default-migrated', '1');
  });
  await setupMockApi(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/app/email/accounts/mailbox');
  // The account URL redirects into its Inbox once the mail module has loaded.
  await expect(page).toHaveURL(/\/inbox/, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Display settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Email display settings' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('the display settings dialog is a wide white sheet grouped into sections', async ({
  page,
}) => {
  const dialog = await openDisplaySettings(page);

  // Noticeably wider than the old max-w-md (28rem / 448px) box.
  const box = await dialog.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(640);

  // White surface — the card token, not the beige page background.
  const surface = await dialog.evaluate((element) => {
    const probe = document.createElement('div');
    probe.className = 'bg-card';
    document.body.append(probe);
    const card = getComputedStyle(probe).backgroundColor;
    const background = getComputedStyle(document.body).backgroundColor;
    probe.remove();
    return { dialog: getComputedStyle(element).backgroundColor, card, background };
  });
  expect(surface.dialog).toBe('rgb(255, 255, 255)');
  expect(surface.dialog).toBe(surface.card);
  expect(surface.dialog).not.toBe(surface.background);

  // Settings sit in titled sections, one row each.
  const mailList = dialog.getByRole('region', { name: 'Mail list' });
  const readingPane = dialog.getByRole('region', { name: 'Reading pane' });
  await expect(mailList.getByRole('heading', { name: 'Mail list' })).toBeVisible();
  await expect(readingPane.getByRole('heading', { name: 'Reading pane' })).toBeVisible();
  await expect(mailList.locator('[data-slot="setting-row"]')).toHaveCount(1);
  await expect(readingPane.locator('[data-slot="setting-row"]')).toHaveCount(3);

  // Each control sits on the right of its explanation, on the same line.
  const viewRow = readingPane.locator('[data-slot="setting-row"]').filter({
    hasText: 'Reading pane view',
  });
  const label = await viewRow.getByText('Reading pane view', { exact: true }).boundingBox();
  const control = await viewRow.getByRole('tablist').boundingBox();
  expect(control!.x).toBeGreaterThan(label!.x + label!.width);
  expect(control!.y).toBeLessThan(label!.y + label!.height + 24);
});

test('every display preference still works after the redesign', async ({ page }) => {
  const dialog = await openDisplaySettings(page);

  for (const name of [
    'Show sender avatars',
    'Collapse long emails',
    'Keep the email header on screen',
  ]) {
    const toggle = dialog.getByRole('switch', { name: new RegExp(name) });
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-checked', before!);
  }

  const emailOnly = dialog.getByRole('tab', { name: 'Email only' });
  const withTimeline = dialog.getByRole('tab', { name: 'Email + Timeline' });
  await emailOnly.click();
  await expect(emailOnly).toHaveAttribute('aria-selected', 'true');
  await expect(withTimeline).toHaveAttribute('aria-selected', 'false');
  await withTimeline.click();
  await expect(withTimeline).toHaveAttribute('aria-selected', 'true');
});
