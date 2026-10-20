import { expect, test, type Page } from '@playwright/test';

/**
 * Sign-in links, against a mocked API.
 *
 * The one that matters most is the second: the link opens this app, the token
 * leaves the address bar at once, and nothing reaches the API's verify
 * endpoint until the person presses Continue — a mail scanner opening the
 * link must not be able to spend it.
 */

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';

type Mocks = { magicLink?: boolean; withMethods?: boolean; password?: boolean };

async function mockSignedOutApi(
  page: Page,
  { magicLink = true, withMethods = true, password = true }: Mocks = {}
) {
  const requests = { magicLink: [] as unknown[], verify: [] as string[] };

  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/api/v1/auth/get-session') {
      await route.fulfill({ json: null });
      return;
    }
    if (path === '/api/v1/auth/config') {
      await route.fulfill({
        json: {
          providers: { microsoft: false },
          ...(withMethods && { methods: { password, magicLink } }),
        },
      });
      return;
    }
    if (path === '/api/v1/auth/sign-in/magic-link') {
      requests.magicLink.push(request.postDataJSON());
      await route.fulfill({ json: { status: true } });
      return;
    }
    if (path === '/api/v1/auth/magic-link/verify') {
      requests.verify.push(request.url());
      // As the API answers a used or expired token: back to sign-in with ?error=.
      await route.fulfill({
        status: 302,
        headers: { location: url.searchParams.get('errorCallbackURL') + '&error=INVALID_TOKEN' },
      });
      return;
    }
    await route.fulfill({ status: 404, json: {} });
  });

  return requests;
}

test('the sign-in page opens on the sign-in link, with the password one click away', async ({
  page,
}) => {
  await mockSignedOutApi(page);
  await page.goto('/sign-in');

  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
  await expect(page.getByLabel('Password')).toHaveCount(0);

  await page.getByRole('button', { name: 'Sign in with your password instead' }).click();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
});

test('the sign-in page opens on the password straight after a password reset', async ({ page }) => {
  await mockSignedOutApi(page);
  await page.goto('/sign-in?pwd_reset=success');

  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
});

test('a sign-in link can be requested from the sign-in page', async ({ page }) => {
  const requests = await mockSignedOutApi(page);
  await page.goto('/sign-in?next=%2Fapp%2Fprojects');

  await page.getByLabel('Email').fill('ann@ellicorp.com');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();

  await expect(page.getByText('Check your email')).toBeVisible();
  await expect(page.getByText(/If ann@ellicorp\.com belongs to an ElliHub account/)).toBeVisible();
  // What to do when nothing arrives, without saying whether the address has an account.
  await expect(
    page.getByText(/Check the address and your junk folder, or ask an administrator/)
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Send again in \d+s/ })).toBeDisabled();
  expect(requests.magicLink).toEqual([
    { email: 'ann@ellicorp.com', metadata: { next: '/app/projects' } },
  ]);
});

test('an opened link waits for Continue, and its token leaves the address bar', async ({
  page,
}) => {
  const requests = await mockSignedOutApi(page);
  await page.goto(`/sign-in?next=%2Fapp%2Fprojects#magic-link=${TOKEN}`);

  const continueButton = page.getByRole('button', { name: 'Continue to ElliHub' });
  await expect(continueButton).toBeVisible();
  expect(page.url()).not.toContain(TOKEN);
  expect(new URL(page.url()).hash).toBe('');
  expect(requests.verify).toEqual([]);

  await continueButton.click();

  await expect(
    page.getByText('This sign-in link no longer works: it expired, was already used, or a newer')
  ).toBeVisible();
  expect(requests.verify).toHaveLength(1);
  const verify = new URL(requests.verify[0]);
  expect(verify.searchParams.get('token')).toBe(TOKEN);
  expect(verify.searchParams.get('callbackURL')).toBe(new URL('/app/projects', page.url()).href);
  expect(new URL(page.url()).searchParams.get('error')).toBe('INVALID_TOKEN');
});

test('an opened link can be set aside for another way to sign in', async ({ page }) => {
  await mockSignedOutApi(page);
  await page.goto(`/sign-in#magic-link=${TOKEN}`);

  await page.getByRole('button', { name: 'Use another way to sign in' }).click();

  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Sign in with your password instead' })
  ).toBeVisible();
});

test('sign-in links are not offered when the API has them off, or predates them', async ({
  page,
}) => {
  await mockSignedOutApi(page, { magicLink: false });
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toHaveCount(0);

  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await mockSignedOutApi(page, { withMethods: false });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toHaveCount(0);
});

test('with password sign-in off, only the sign-in link is offered', async ({ page }) => {
  await mockSignedOutApi(page, { password: false });
  await page.goto('/sign-in?pwd_reset=success');

  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
  await expect(page.getByLabel('Password')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Sign in with your password instead' })
  ).toHaveCount(0);
});

test('with password sign-in off, the forgot-password page points to sign-in', async ({ page }) => {
  await mockSignedOutApi(page, { password: false });
  await page.goto('/forgot-password');

  await expect(page.getByRole('heading', { name: 'Passwords are turned off' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute(
    'href',
    '/sign-in'
  );
});
