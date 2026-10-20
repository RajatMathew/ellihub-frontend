import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

/**
 * The Quick Shortcuts header: title, shortcut count, then the manage button
 * and collapse chevron laid over the trigger's right end.
 *
 * The room for those two was reserved with padding, and the Editorial theme
 * sets every sidebar group trigger's padding, so under it the count sat right
 * on top of the chevron.
 */

const ROUTE_TIMEOUT = 15_000;
const NOW = '2026-06-11T00:00:00.000Z';

const shortcut = (id: string, name: string, position: number) => ({
  createdAt: NOW,
  destinationType: 'INTERNAL',
  externalUrl: null,
  id,
  internalPath: '/app/monthly-bills',
  name,
  openInNewTab: false,
  position,
  updatedAt: NOW,
});

async function mockApi(page: Page, shortcutCount: number) {
  await page.route('**/api/v1/**', async (route: Route) => {
    const path = new URL(route.request().url()).pathname;

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { expiresAt: '2026-12-31T00:00:00Z', id: 'session-1', userId: 'user-admin' },
          user: { email: 'admin@elli.com', id: 'user-admin', name: 'Admin User' },
        },
      });
      return;
    }

    if (path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            employeeId: 'employee-admin',
            isAdmin: true,
            isDev: false,
            permissions: {},
            projectScope: 'all',
            role: 'admin',
            userId: 'user-admin',
          },
        },
      });
      return;
    }

    if (path === '/api/v1/quick-shortcuts') {
      await route.fulfill({
        json: {
          data: Array.from({ length: shortcutCount }, (_, index) =>
            shortcut(`s${index}`, `Shortcut ${index + 1}`, index)
          ),
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (!found) throw new Error('an element has no box');
  return found;
};

const overlaps = async (a: Locator, b: Locator) => {
  const [boxA, boxB] = [await box(a), await box(b)];
  return boxA.x < boxB.x + boxB.width && boxB.x < boxA.x + boxA.width;
};

// Below 1024px the sidebar is a slide-out drawer, at most 288px wide and the
// full width on the smallest phones; from 1024px it is the fixed column.
const VIEWPORTS = [
  { name: 'small phone', width: 320, height: 640, drawer: true },
  { name: 'phone', width: 390, height: 844, drawer: true },
  { name: 'tablet', width: 768, height: 1024, drawer: true },
  { name: 'small desktop', width: 1024, height: 768, drawer: false },
  { name: 'desktop', width: 1440, height: 900, drawer: false },
];

for (const viewport of VIEWPORTS) {
  for (const theme of ['editorial', 'light']) {
    for (const shortcutCount of [2, 12]) {
      test(`the header's count and icons stay apart: ${viewport.name}, ${theme}, ${shortcutCount} shortcuts`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript((value) => localStorage.setItem('vite-theme', value), theme);
        await mockApi(page, shortcutCount);
        await page.goto('/app/files');

        if (viewport.drawer) {
          // The drawer's trigger is the header's icon-only menu button.
          await page.locator('header button:has(svg.lucide-menu)').first().click({
            timeout: ROUTE_TIMEOUT,
          });
          // Measure the drawer where it comes to rest, not mid-slide.
          await page.waitForFunction(() =>
            document.getAnimations().every((animation) => animation.playState !== 'running')
          );
        }

        const header = page
          .locator('[data-slot="accordion-menu-sub-trigger"]', { hasText: 'Quick Shortcuts' })
          .last();
        const title = header.getByText('Quick Shortcuts', { exact: true });
        const count = header.getByText(String(shortcutCount), { exact: true });
        const chevron = header.locator('[data-slot="accordion-menu-sub-indicator"]');
        const manage = page.getByRole('button', { name: 'Manage Quick Shortcuts' }).last();
        await expect(count).toBeVisible({ timeout: ROUTE_TIMEOUT });

        expect(await overlaps(title, count)).toBe(false);
        expect(await overlaps(count, manage)).toBe(false);
        expect(await overlaps(count, chevron)).toBe(false);
        expect(await overlaps(manage, chevron)).toBe(false);

        // Everything sits inside the header's own box, nothing spilling out.
        const row = await box(header.locator('..'));
        for (const part of [title, count, manage, chevron]) {
          const { x, width } = await box(part);
          expect(x).toBeGreaterThanOrEqual(row.x - 0.5);
          expect(x + width).toBeLessThanOrEqual(row.x + row.width + 0.5);
        }
      });
    }
  }
}
