import { expect, test, type Page } from '@playwright/test';

/**
 * Proves the two things a real mailbox gives you, without needing one.
 *
 * Only the provider-supplied data is faked — the connected account and its
 * messages, exactly what the Google OAuth approval would unlock. Everything
 * else is the real app: the real workspace header, the real reading pane, the
 * real popover, and the real request the task API will receive. So when the
 * OAuth app finally lets an account through, this same path is what runs.
 */

const ACCOUNT_ID = 'task-account';
const ACCOUNT_SLUG = 'task-account-slug';
// A second mailbox, for the board's picker to have a choice to not make (#968).
const SECOND_ACCOUNT_ID = 'contracts-account';
const SECOND_ACCOUNT_NICKNAME = 'Elli - Contracts';
const ADDRESS = 'procurement@ellicorp.com';
const MESSAGE_ID = 'message-1';
const PROVIDER_ID = 'provider-message-1';
const CONVERSATION_KEY = 'conversation-1';
const SUBJECT = 'Approve Brooklyn Solid Surface invoice';

const freshness = {
  state: 'fresh',
  lastSyncedAt: '2026-09-01T10:00:00.000Z',
  staleSince: null,
  reason: null,
  errorCode: null,
  syncing: false,
};

const message = {
  id: MESSAGE_ID,
  providerId: PROVIDER_ID,
  threadId: 'thread-1',
  conversationKey: CONVERSATION_KEY,
  senderName: 'Brooklyn Solid Surface Co.',
  senderEmail: 'ap@brooklynsolidsurface.com',
  subject: SUBJECT,
  preview: 'Match against PO-118 and delivery receipt.',
  receivedAt: '2026-09-01T11:42:00.000Z',
  folderId: 'folder-inbox',
  folder: 'Inbox',
  mailbox: ADDRESS,
  unread: false,
  body: ['Match against PO-118 and delivery receipt — quantities and freight tie out.'],
};

// A second message in the inbox, so the picker has something to offer that is
// not already attached — which is the whole of #861.
const otherMessage = {
  ...message,
  id: 'message-2',
  providerId: 'provider-message-2',
  threadId: 'thread-2',
  conversationKey: 'conversation-2',
  senderName: 'Boyland Steel',
  senderEmail: 'submittals@boylandsteel.com',
  subject: 'Boyland shop drawings, rev C',
  preview: 'Rev C supersedes what went out Friday.',
  receivedAt: '2026-09-01T09:15:00.000Z',
};

type CreatedTask = {
  title: string;
  priority: string;
  emailReferences?: { accountId: string; providerId: string; subject?: string | null }[];
};

// One task citing five threads, which is what puts the card over its limit.
const MULTI_REFERENCE_TASKS = [
  {
    id: 'multi-1',
    title: 'Reconcile the Boyland submittals',
    description: null,
    priority: 'P2',
    status: 'OPEN',
    court: 'OURS',
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    dueHasTime: true,
    completedAt: null,
    assigneeId: null,
    assignee: null,
    entityLinks: [],
    emailReferences: [1, 2, 3, 4, 5].map((n) => ({
      accountId: ACCOUNT_ID,
      providerId: `ref-${n}`,
      conversationKey: `conv-${n}`,
      threadId: `thread-${n}`,
      subject: `Reference thread ${n}`,
      fromEmail: `sender${n}@example.com`,
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function setupMockApi(page: Page, options: { secondAccount?: boolean } = {}) {
  const createdTasks: CreatedTask[] = [];
  const updatedTasks: CreatedTask[] = [];
  /** Every request to the cross-mailbox search, by its term ('' for recent). */
  const acrossSearches: string[] = [];
  /** Requests to a single mailbox's list or search, which "All" must not make. */
  const singleMailboxReads: string[] = [];

  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 's1', userId: 'user-admin', expiresAt: '2027-01-01T00:00:00.000Z' },
          user: { id: 'user-admin', name: 'Elli Admin', email: 'admin@elli.com' },
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
            permissions: { mail: ['read'], task: ['create', 'read', 'update', 'delete'] },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/config') {
      await route.fulfill({
        json: { data: { enabledProviders: ['gmail', 'outlook', 'zoho'], maxPersonalAccounts: 5 } },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/quick-shortcuts') {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/email/accounts') {
      await route.fulfill({
        json: {
          data: [
            {
              id: ACCOUNT_ID,
              slug: ACCOUNT_SLUG,
              email: ADDRESS,
              mailboxAddress: ADDRESS,
              displayName: ADDRESS,
              nickname: ADDRESS,
              needsNickname: false,
              provider: 'outlook',
              calendarAccess: 'granted',
              status: 'CONNECTED',
              lastSyncedAt: freshness.lastSyncedAt,
              connectedById: 'user-admin',
              freshness,
            },
            ...(options.secondAccount
              ? [
                  {
                    id: SECOND_ACCOUNT_ID,
                    slug: 'contracts',
                    email: 'contracts@ellicorp.com',
                    mailboxAddress: 'contracts@ellicorp.com',
                    displayName: SECOND_ACCOUNT_NICKNAME,
                    nickname: SECOND_ACCOUNT_NICKNAME,
                    needsNickname: false,
                    provider: 'outlook',
                    calendarAccess: 'granted',
                    status: 'CONNECTED',
                    lastSyncedAt: freshness.lastSyncedAt,
                    connectedById: null,
                    freshness,
                  },
                ]
              : []),
          ],
        },
      });
      return;
    }

    // Across every mailbox, from the server's cache: rows carry their account.
    if (method === 'GET' && path === '/api/v1/email/messages/search') {
      const term = (new URL(request.url()).searchParams.get('q') || '').toLowerCase();
      acrossSearches.push(term);
      const rows = [
        {
          accountId: SECOND_ACCOUNT_ID,
          providerId: 'p-contracts-1',
          threadId: 't-contracts-1',
          conversationKey: 'c-contracts-1',
          subject: 'Boyland subcontract, countersigned',
          senderName: 'Boyland Steel',
          senderEmail: 'legal@boylandsteel.com',
          preview: '',
          receivedAt: '2026-09-02T10:00:00.000Z',
          folder: 'inbox',
        },
        {
          accountId: ACCOUNT_ID,
          providerId: PROVIDER_ID,
          threadId: 't-open',
          conversationKey: 'c-open',
          subject: SUBJECT,
          senderName: 'Boyland Steel',
          senderEmail: 'submittals@boylandsteel.com',
          preview: '',
          receivedAt: '2026-09-01T09:15:00.000Z',
          folder: 'inbox',
        },
      ];
      await route.fulfill({
        json: {
          success: true,
          data: term ? rows.filter((row) => row.subject.toLowerCase().includes(term)) : rows,
        },
      });
      return;
    }

    if (method === 'GET' && /^\/api\/v1\/email\/accounts\/[^/]+\/messages(\/search)?$/.test(path)) {
      singleMailboxReads.push(path);
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
      await route.fulfill({
        json: {
          data: {
            records: [message, otherMessage],
            nextPageToken: null,
            pageSize: 100,
            totalCount: 1,
            freshness,
          },
        },
      });
      return;
    }

    // The task API is the real contract this feature writes against.
    if (method === 'GET' && path === `/api/v1/email/accounts/${ACCOUNT_ID}/messages/search`) {
      const term = (new URL(request.url()).searchParams.get('q') || '').toLowerCase();
      const extras = [3, 4, 5, 6, 7, 8].map((n) => ({
        providerId: `p-extra-${n}`,
        threadId: `t-extra-${n}`,
        conversationKey: `c-extra-${n}`,
        subject: `Alpha follow-up ${n}`,
        senderName: 'Apex Hardware',
        senderEmail: 'apex@example.com',
        preview: 'more',
        receivedAt: new Date().toISOString(),
        folder: 'inbox',
      }));
      const all = [
        ...extras,
        {
          providerId: 'p-alpha',
          threadId: 't-alpha',
          conversationKey: 'c-alpha',
          subject: 'Alpha submittal overdue',
          senderName: 'Apex Hardware',
          senderEmail: 'apex@example.com',
          preview: 'chasing',
          receivedAt: new Date().toISOString(),
          folder: 'archive',
        },
        {
          providerId: 'p-beta',
          threadId: 't-beta',
          conversationKey: 'c-beta',
          subject: 'Beta invoice mismatch',
          senderName: 'Brooklyn Solid Surface',
          senderEmail: 'bss@example.com',
          preview: 'two-way',
          receivedAt: new Date().toISOString(),
          folder: 'sent',
        },
      ].filter((m) => m.subject.toLowerCase().includes(term) || term === 'a');
      await route.fulfill({ json: { success: true, data: all } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/task') {
      await route.fulfill({
        json: {
          success: true,
          message: 'OK',
          data: MULTI_REFERENCE_TASKS,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        },
      });
      return;
    }

    if (method === 'POST' && path === '/api/v1/task') {
      const body = request.postDataJSON() as CreatedTask;
      createdTasks.push(body);
      await route.fulfill({
        status: 201,
        json: {
          success: true,
          message: 'OK',
          data: {
            id: 'task-created-1',
            title: body.title,
            description: null,
            priority: body.priority,
            status: 'OPEN',
            court: 'OURS',
            dueAt: null,
            dueHasTime: false,
            completedAt: null,
            assigneeId: null,
            assignee: null,
            entityLinks: [],
            emailReferences: body.emailReferences ?? [],
            createdAt: '2026-09-01T12:00:00.000Z',
            updatedAt: '2026-09-01T12:00:00.000Z',
          },
        },
      });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/task') {
      const body = request.postDataJSON() as CreatedTask;
      updatedTasks.push(body);
      await route.fulfill({
        json: { success: true, message: 'OK', data: { ...MULTI_REFERENCE_TASKS[0], ...body } },
      });
      return;
    }

    // Anything else the mailbox asks for is not what this test is about.
    await route.fulfill({ json: { data: null } });
  });

  return { createdTasks, updatedTasks, acrossSearches, singleMailboxReads };
}

test('the open email is attached by default and more can be added', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();
  const popover = page.getByRole('dialog');
  await expect(popover).toBeVisible();

  // The open message is there without anyone asking for it.
  await expect(popover.getByText(SUBJECT, { exact: false }).first()).toBeVisible();

  // And it cannot be removed while it is the only one.
  const removeFirst = popover.getByRole('button', { name: /^Remove / });
  await expect(removeFirst).toBeDisabled();

  await popover.getByRole('button', { name: 'Attach another email' }).click();
  const picker = page.getByPlaceholder('Search subject or sender');
  await expect(picker).toBeVisible();
  await picker.fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: 'output/visual/tmp-refs-picker.png', animations: 'disabled' });

  await page.getByText('Alpha submittal overdue').click();
  await page.keyboard.press('Escape');

  // Two chips now, and the first has become removable.
  await expect(popover.getByRole('button', { name: /^Remove / })).toHaveCount(2);
  await expect(popover.getByRole('button', { name: /^Remove / }).first()).toBeEnabled();
  await page.screenshot({ path: 'output/visual/tmp-refs-chips.png', animations: 'disabled' });
});

test('a task created this way sends every attached email', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();
  const popover = page.getByRole('dialog');
  await popover.getByRole('button', { name: 'Attach another email' }).click();
  await page.getByPlaceholder('Search subject or sender').fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15000 });
  await page.getByText('Alpha submittal overdue').click();
  await page.keyboard.press('Escape');

  await popover.getByRole('button', { name: 'Add task' }).click();
  await expect.poll(() => api.createdTasks.length, { timeout: 15000 }).toBeGreaterThan(0);
  const refs = api.createdTasks[0].emailReferences;
  expect(refs).toHaveLength(2);
});

test('a card shows three sources and hides the rest behind a count', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto('/app/tasks');

  await expect(page.getByText('Reconcile the Boyland submittals')).toBeVisible({
    timeout: 30_000,
  });

  // Three of five, and the other two behind a count rather than a taller card.
  await expect(page.getByText('Reference thread 3')).toBeVisible();
  await expect(page.getByText('Reference thread 4')).toBeHidden();

  // `exact` matters: the dnd-kit wrapper around the card is itself role=button,
  // and its accessible name is the whole card's text, so a substring match finds
  // it too.
  // Each source is a way back into the mail, not a note about it.
  const firstSource = page.getByRole('link', { name: 'Reference thread 1' });
  await expect(firstSource).toBeVisible();
  await expect(firstSource).toHaveAttribute(
    'href',
    `/app/email/accounts/${ACCOUNT_SLUG}/inbox/id/conv-1`
  );

  const more = page.getByRole('button', { name: '+2', exact: true });
  await expect(more).toBeVisible();
  await page.screenshot({
    path: 'output/visual/task-card-email-sources.png',
    animations: 'disabled',
  });

  await more.click();
  await expect(page.getByText('Reference thread 4')).toBeVisible();
  await expect(page.getByText('Reference thread 5')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show less', exact: true })).toBeVisible();
  await page.screenshot({
    path: 'output/visual/task-card-email-sources-expanded.png',
    animations: 'disabled',
  });
});

test('the sources are labelled as a group, not led by a line that reads as one', async ({
  page,
}) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto('/app/tasks');

  await expect(page.getByText('Reconcile the Boyland submittals')).toBeVisible({
    timeout: 30_000,
  });

  // The lead-in used to be concatenated into the first source's line — `from
  // email · Reference thread 1` — so it read as a fourth subject in the list.
  // It is a heading of its own now, and the list it names is a real list.
  const heading = page.getByText('From email', { exact: true });
  await expect(heading).toBeVisible();

  const firstSource = page.getByRole('link', { name: 'Reference thread 1' });
  await expect(firstSource).toHaveText('Reference thread 1');

  const sources = page.getByRole('list').filter({ has: firstSource });
  await expect(sources.getByRole('listitem')).toHaveCount(3);
  // The heading names the list without being an item in it.
  await expect(sources.getByText('From email')).toHaveCount(0);

  // Nothing here is tinted any more. `destructive` is the colour of a delete
  // confirmation; where a task came from is not a warning.
  const colour = await firstSource.evaluate((el) => getComputedStyle(el).color);
  const danger = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--destructive').trim()
  );
  expect(danger).not.toBe('');
  expect(colour).not.toBe(danger);
  await expect(firstSource).toHaveCSS('font-style', 'normal');

  // The card on its own, big enough to judge the type and the spacing by.
  const card = page.locator('[data-slot="kanban-item"]').first();
  await card.screenshot({
    path: 'output/visual/task-card-sources-detail.png',
    animations: 'disabled',
  });
});

test('clicking a source opens that email', async ({ page }) => {
  await setupMockApi(page);
  await page.goto('/app/tasks');

  const source = page.getByRole('link', { name: 'Reference thread 2' });
  await expect(source).toBeVisible({ timeout: 30_000 });
  await source.click();

  await expect(page).toHaveURL(new RegExp(`/app/email/accounts/${ACCOUNT_SLUG}/inbox/id/conv-2$`));
});

test('Clear all stops at the one email the view requires', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();

  const popover = page.getByRole('dialog');
  await popover.getByRole('button', { name: 'Attach another email' }).click();

  // Nothing to clear while the only email is the required one.
  const clearAll = page.getByRole('button', { name: 'Clear all' });
  await expect(clearAll).toBeDisabled();

  await page.getByPlaceholder('Search subject or sender').fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15_000 });
  await page.getByText('Alpha submittal overdue').click();
  await expect(popover.getByRole('button', { name: /^Remove / })).toHaveCount(2);

  // Now it has something to do — and stops at one rather than emptying.
  await expect(clearAll).toBeEnabled();
  await clearAll.click();
  await expect(popover.getByRole('button', { name: /^Remove / })).toHaveCount(1);
  await expect(clearAll).toBeDisabled();
});

test('the picker does not resize as results arrive', async ({ page }) => {
  await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);
  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Attach another email' }).click();

  // Sized to its content, the results list grew as matches arrived and Radix
  // re-anchored the panel around it — it jumped up the screen mid-keystroke.
  // A fixed height is the fix, so the list is what this measures: same box
  // empty or full. Asserting the panel's position instead looks like the
  // symptom but barely moves under test, where there is room below it to grow
  // into; the list height is the mechanism and is exact.
  const list = page.locator('[cmdk-list]');
  const empty = await list.boundingBox();

  await page.getByPlaceholder('Search subject or sender').fill('a');
  await expect(page.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15_000 });
  const full = await list.boundingBox();

  // Not pixel-exact: cmdk drives its own list height through a CSS variable, so
  // the two states land ~13px apart even when pinned. Unpinned they are ~193px
  // apart — an empty list of 63px against a full one of 256 — which is the jump
  // this guards against. Anything under 40 is pinned; anything over is not.
  expect(Math.abs((full?.height ?? 0) - (empty?.height ?? 0))).toBeLessThan(40);
});

test('the picker opens on recent mail, so attaching one costs no typing', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 950 });
  await page.goto(`/app/email/accounts/${ACCOUNT_SLUG}`);

  await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(SUBJECT).first().click();
  await page.getByRole('button', { name: 'Add task for this email' }).click();

  const popover = page.getByRole('dialog');
  await popover.getByRole('button', { name: 'Attach another email' }).click();

  // Scoped to the picker's own list: the mail list behind it shows the same
  // subjects, so an unscoped locator matches twice.
  const suggestions = page.getByLabel('Suggestions');
  const other = suggestions.getByText('Boyland shop drawings, rev C');

  // #861: it used to open on `Search your mail to attach another thread.` and
  // show nothing until you typed. The inbox is what you almost always want.
  await expect(page.getByPlaceholder('Search subject or sender')).toHaveValue('');
  await expect(other).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Search your mail to attach another thread.')).toHaveCount(0);

  await page.screenshot({
    path: 'output/visual/task-refs-picker-recent.png',
    animations: 'disabled',
  });

  // Attachable straight from that list, no search involved.
  await other.click();
  await page.keyboard.press('Escape');
  await expect(popover.getByRole('button', { name: /^Remove / })).toHaveCount(2);

  // Search still narrows to something the inbox list did not show.
  await popover.getByRole('button', { name: 'Attach another email' }).click();
  await page.getByPlaceholder('Search subject or sender').fill('a');
  await expect(suggestions.getByText('Alpha submittal overdue')).toBeVisible({ timeout: 15_000 });

  // Clearing the term falls back to the inbox rather than to an empty panel.
  await page.getByPlaceholder('Search subject or sender').fill('');
  await expect(other).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');

  // And what it sends is a real reference, not a row that looked attachable.
  await popover.getByRole('button', { name: 'Add task' }).click();
  await expect.poll(() => api.createdTasks.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const refs = api.createdTasks[0].emailReferences ?? [];
  expect(refs.map((ref) => ref.providerId)).toContain('provider-message-2');
});

test('a task made on the board can cite mail too, without one being open', async ({ page }) => {
  const api = await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/app/tasks');

  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'New task' }).first().click();

  const dialog = page.getByRole('dialog').first();
  await expect(dialog.getByText('New Task')).toBeVisible();

  // #861: the board's dialog had no way to link mail at all.
  await expect(dialog.getByText('Linked emails')).toBeVisible();

  // Nothing is attached — a board task need not cite an email, unlike one
  // raised from a message.
  await expect(dialog.getByRole('button', { name: /^Remove / })).toHaveCount(0);

  // The picker still finds a mailbox with no open message to take one from.
  const attach = page.getByRole('button', { name: 'Attach another email' });
  await expect(attach).toBeEnabled();
  await attach.click();

  const suggestions = page.getByLabel('Suggestions');
  await expect(suggestions.getByText(SUBJECT)).toBeVisible({ timeout: 15_000 });

  // One account, so nothing to choose between and no control offered.
  await expect(page.getByRole('combobox', { name: /mailbox/i })).toHaveCount(0);

  await suggestions.getByText(SUBJECT).click();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('button', { name: /^Remove / })).toHaveCount(1);

  await page.screenshot({
    path: 'output/visual/task-dialog-linked-emails.png',
    animations: 'disabled',
  });

  // And it reaches the API with the task.
  await dialog.getByPlaceholder('Add a title').fill('Chase the Boyland cert');
  await dialog.getByRole('button', { name: 'Create task' }).click();

  await expect.poll(() => api.createdTasks.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const refs = api.createdTasks[0].emailReferences ?? [];
  expect(refs.map((ref) => ref.providerId)).toContain(PROVIDER_ID);
});

test("with more than one mailbox, the board's picker starts on all of them", async ({ page }) => {
  const api = await setupMockApi(page, { secondAccount: true });
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/app/tasks');

  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'New task' }).first().click();
  await page.getByRole('button', { name: 'Attach another email' }).click();

  // The choice is offered, and the default is not to make one.
  const mailbox = page.getByRole('combobox', { name: 'Mailbox' });
  await expect(mailbox).toBeVisible();
  await expect(mailbox).toHaveText('All email accounts');

  // Recent mail from both, in one request, and none to either mailbox alone.
  const suggestions = page.getByLabel('Suggestions');
  await expect(suggestions.getByText('Boyland subcontract, countersigned')).toBeVisible({
    timeout: 15_000,
  });
  await expect(suggestions.getByText(SUBJECT)).toBeVisible();
  expect(api.acrossSearches).toEqual(['']);
  expect(api.singleMailboxReads).toEqual([]);

  // Each row says which mailbox it is in.
  const labels = suggestions.getByTestId('picker-mailbox');
  await expect(labels).toHaveText([SECOND_ACCOUNT_NICKNAME, ADDRESS]);

  await page.screenshot({
    path: 'output/visual/task-picker-all-accounts.png',
    animations: 'disabled',
  });
});

test('typing searches every mailbox in one request, and a pick keeps its own mailbox', async ({
  page,
}) => {
  const api = await setupMockApi(page, { secondAccount: true });
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/app/tasks');

  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'New task' }).first().click();
  const dialog = page.getByRole('dialog').first();
  await page.getByRole('button', { name: 'Attach another email' }).click();

  const suggestions = page.getByLabel('Suggestions');
  await expect(suggestions.getByText(SUBJECT)).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder('Search subject or sender').fill('countersigned');
  await expect(suggestions.getByText(SUBJECT)).toBeHidden();
  await expect(suggestions.getByText('Boyland subcontract, countersigned')).toBeVisible();
  await expect.poll(() => api.acrossSearches).toEqual(['', 'countersigned']);
  expect(api.singleMailboxReads).toEqual([]);

  await suggestions.getByText('Boyland subcontract, countersigned').click();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('button', { name: /^Remove / })).toHaveCount(1);

  await dialog.getByPlaceholder('Add a title').fill('Countersign the Boyland subcontract');
  await dialog.getByRole('button', { name: 'Create task' }).click();

  // Saved against the mailbox the row came from, not the first in the list.
  await expect.poll(() => api.createdTasks.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const refs = api.createdTasks[0].emailReferences ?? [];
  expect(refs).toEqual([
    expect.objectContaining({ accountId: SECOND_ACCOUNT_ID, providerId: 'p-contracts-1' }),
  ]);
});

test('picking one mailbox narrows the picker to it, as before', async ({ page }) => {
  const api = await setupMockApi(page, { secondAccount: true });
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/app/tasks');

  await expect(page.getByRole('heading', { name: 'Tasks', level: 1 })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'New task' }).first().click();
  await page.getByRole('button', { name: 'Attach another email' }).click();

  const suggestions = page.getByLabel('Suggestions');
  await expect(suggestions.getByText(SUBJECT)).toBeVisible({ timeout: 15_000 });

  await page.getByRole('combobox', { name: 'Mailbox' }).click();
  await page.getByRole('option', { name: ADDRESS }).click();

  // The single-mailbox list, from that mailbox's own endpoint, with no
  // mailbox label - there is only one it could be.
  await expect.poll(() => api.singleMailboxReads.length).toBeGreaterThan(0);
  expect(api.singleMailboxReads[0]).toBe(`/api/v1/email/accounts/${ACCOUNT_ID}/messages`);
  await expect(suggestions.getByText('Boyland subcontract, countersigned')).toBeHidden();
  await expect(suggestions.getByTestId('picker-mailbox')).toHaveCount(0);
});

test('editing a task keeps the emails it already cites, and saves a change to them', async ({
  page,
}) => {
  const api = await setupMockApi(page);
  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto('/app/tasks');

  await expect(page.getByText('Reconcile the Boyland submittals')).toBeVisible({
    timeout: 30_000,
  });
  // `exact`: the dnd-kit wrapper around the card is itself role=button and its
  // name is the whole card's text, so a substring match finds it too — and
  // clicking the wrapper does not open the task.
  await page.getByRole('button', { name: 'Reconcile the Boyland submittals', exact: true }).click();

  const dialog = page.getByRole('dialog').first();
  await expect(dialog.getByText('Edit Task')).toBeVisible();

  // The five it already cites are loaded into the field, not dropped on open —
  // saving would otherwise quietly strip a task's provenance.
  await expect(dialog.getByRole('button', { name: /^Remove / })).toHaveCount(5);

  // Nothing is required here, so all five can go.
  await dialog.getByRole('button', { name: 'Remove Reference thread 5' }).click();
  await expect(dialog.getByRole('button', { name: /^Remove / })).toHaveCount(4);

  await dialog.getByRole('button', { name: 'Save task' }).click();

  await expect.poll(() => api.updatedTasks.length, { timeout: 15_000 }).toBeGreaterThan(0);
  const refs = api.updatedTasks[0].emailReferences ?? [];
  expect(refs).toHaveLength(4);
  expect(refs.map((ref) => ref.providerId)).not.toContain('ref-5');
});
