import { expect, test, type Page } from '@playwright/test';

/**
 * elli-ui#1067: the Save to Files dialog offers every project the thread is
 * linked to, and picking one moves the folder picker into that project.
 *
 * A thread filed under two projects used to open the picker inside the first
 * one only, with no way across to the second.
 */
test.describe.configure({ timeout: 60_000 });

const PROJECTS: Record<string, { label: string; folderId: string; subfolder: string }> = {
  'project-bpl': {
    label: 'Brooklyn Public Library',
    folderId: 'folder-bpl',
    subfolder: 'BPL drawings',
  },
  'project-105': { label: 'PS 105X', folderId: 'folder-105', subfolder: 'PS 105X submittals' },
};

const CAN_WRITE = {
  read: true,
  download: true,
  export: true,
  upload: true,
  createFolder: true,
  update: true,
  delete: true,
};

const ATTACHMENT = {
  id: 'attachment-1',
  name: 'Finish-Schedule.png',
  mimeType: 'image/png',
  sizeBytes: 2048,
};

// A 1×1 PNG, so the preview has a real image to render.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const classification = {
  id: 'classification-1',
  conversationKey: 'thread-1',
  threadId: 'thread-1',
  status: 'unset',
  pinnedAt: null,
  assignedTo: null,
  references: Object.entries(PROJECTS).map(([entityId, project]) => ({
    type: 'project',
    entityType: 'project',
    entityId,
    label: project.label,
  })),
};

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
    senderName: 'Field Office',
    senderEmail: 'field@example.com',
    subject: 'Finish schedule',
    preview: 'Schedule attached',
    receivedAt: '2026-07-31T10:00:00.000Z',
  },
] as const;

async function setupMockApi(page: Page, projectFolderLookups: string[]) {
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
              attachmentCount: 1,
              threadMessageCount: 1,
              classification,
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
      new RegExp(`^/api/v1/email/accounts/${ACCOUNT_ID}/conversations/(thread-1)/messages$`)
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
              body: ['<p>Schedule attached.</p>'],
              attachments: [ATTACHMENT],
            },
          ],
        },
      });
      return;
    }

    if (
      method === 'GET' &&
      path ===
        `/api/v1/email/accounts/${ACCOUNT_ID}/messages/message-1/attachments/${ATTACHMENT.id}`
    ) {
      await route.fulfill({ body: PIXEL_PNG, contentType: ATTACHMENT.mimeType });
      return;
    }

    const projectFolder = path.match(/^\/api\/v1\/file\/project\/([^/]+)\/folder$/);
    if (method === 'GET' && projectFolder) {
      projectFolderLookups.push(projectFolder[1]!);
      await route.fulfill({ json: { data: PROJECTS[projectFolder[1]!]!.folderId } });
      return;
    }

    const folder = path.match(/^\/api\/v1\/file\/folder\/([^/]+)$/);
    if (method === 'GET' && folder) {
      const project = Object.values(PROJECTS).find((entry) => entry.folderId === folder[1]);
      await route.fulfill({
        json: {
          data: {
            id: folder[1],
            name: project?.label ?? 'Folder',
            type: 'FOLDER',
            isDeletable: false,
            capabilities: CAN_WRITE,
            breadcrumbs: [
              { id: 'root', name: 'root' },
              { id: folder[1], name: project?.label ?? 'Folder' },
            ],
            children: [
              {
                id: `${folder[1]}-sub`,
                name: project?.subfolder ?? 'Sub',
                type: 'FOLDER',
                isDeletable: true,
                capabilities: CAN_WRITE,
              },
            ],
          },
        },
      });
      return;
    }

    await route.fulfill({ json: { data: [] } });
  });
}

test('saves into any project the thread is linked to', async ({ page }) => {
  const projectFolderLookups: string[] = [];
  await setupMockApi(page, projectFolderLookups);
  await page.goto('/app/email/accounts/mailbox');

  await page.getByRole('button', { name: /Field Office: Finish schedule/ }).click();
  await expect(page.getByRole('heading', { name: 'Finish schedule', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Actions for Finish-Schedule.png' }).click();
  await page.getByRole('menuitem', { name: 'Add to folder' }).click();

  const dialog = page.getByRole('dialog');
  const chips = dialog.getByRole('group', { name: 'Projects' });
  const first = chips.getByRole('button', { name: 'Brooklyn Public Library' });
  const second = chips.getByRole('button', { name: 'PS 105X' });

  // Both linked projects, the first one picked and open.
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await expect(second).toHaveAttribute('aria-pressed', 'false');
  await expect(dialog.getByText('BPL drawings')).toBeVisible();

  await second.click();

  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByText('PS 105X submittals')).toBeVisible();
  await expect(dialog.getByText('BPL drawings')).toBeHidden();
  await expect(dialog.getByText(/Saving to\s*PS 105X/)).toBeVisible();

  // The second project's folder was looked up when it was picked, and the
  // first one's only once — the dialog reuses the reading pane's lookup.
  expect(projectFolderLookups.filter((id) => id === 'project-105')).toHaveLength(1);
  expect(projectFolderLookups.filter((id) => id === 'project-bpl')).toHaveLength(1);

  // Back to the first: already known, so no new lookup.
  await first.click();
  await expect(dialog.getByText('BPL drawings')).toBeVisible();
  expect(projectFolderLookups.filter((id) => id === 'project-bpl')).toHaveLength(1);
});

/**
 * elli-ui#1364: the preview's save button was a bare folder icon, and the
 * dialog's auto-focus landed on it, so it opened wearing a focus ring.
 */
test('the attachment preview offers "Add to folder" by name, unfocused', async ({ page }) => {
  await setupMockApi(page, []);
  await page.goto('/app/email/accounts/mailbox');

  await page.getByRole('button', { name: /Field Office: Finish schedule/ }).click();
  await page.getByRole('button', { name: 'Actions for Finish-Schedule.png' }).click();
  await page.getByRole('menuitem', { name: 'Preview' }).click();

  const preview = page.getByRole('dialog', { name: 'Finish-Schedule.png' });
  const addToFolder = preview.getByRole('button', { name: 'Add to folder' });

  // Says what it does, in the attachment menu's words.
  await expect(addToFolder).toHaveText('Add to folder');
  // Opening the preview focuses the dialog, not its first button.
  await expect(preview).toBeFocused();
  await expect(addToFolder).not.toBeFocused();

  // And it still opens the folder picker.
  await addToFolder.click();
  await expect(page.getByRole('dialog').getByRole('group', { name: 'Projects' })).toBeVisible();
});
