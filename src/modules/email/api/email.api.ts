import api from '@/app/api';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import type { EmailProvider } from '@/modules/email/constants/email-providers';
import { getDraftSaveTarget } from '@/modules/email/lib/email-draft-save-target';
import { dedupeEmailAccounts } from '@/modules/email/utils/email-account-identity';
import type { AxiosProgressEvent } from 'axios';
import { z } from 'zod';

const BASE = '/email';

const emailContactSuggestionSchema = z.object({
  name: z.string().nullable(),
  address: z.string(),
});
export type EmailContactSuggestion = z.infer<typeof emailContactSuggestionSchema>;

/** URL for a sender's profile photo — used directly as an <img> src. */
export function getSenderPhotoUrl(accountId: string, address: string): string {
  return `${import.meta.env.VITE_API_BASE_URL}/api/v1${BASE}/accounts/${accountId}/sender-photo?address=${encodeURIComponent(address)}`;
}

const emailFreshnessSchema = z.object({
  state: z.enum(['fresh', 'stale', 'syncing', 'error']),
  lastSyncedAt: z.string().nullable(),
  staleSince: z.string().nullable(),
  reason: z.string().nullable(),
  errorCode: z.string().nullable(),
  syncing: z.boolean(),
});

const emailAccountSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  email: z.string(),
  mailboxAddress: z.string(),
  displayName: z.string(),
  nickname: z.string(),
  needsNickname: z.boolean(),
  provider: z.enum(['gmail', 'outlook', 'zoho']),
  inlineImageBaseUrl: z.string().url().nullable().optional(),
  calendarAccess: z.enum(['granted', 'reauthorizationRequired', 'notApplicable']),
  status: z.string(),
  lastSyncedAt: z.string().nullable(),
  connectedById: z.string().nullable(),
  sharedMailboxKey: z.string().nullable().optional(),
  freshness: emailFreshnessSchema.optional(),
});

const emailFolderSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  fullName: z.string().nullable(),
  parentId: z.string().nullable().optional(),
  sysLabel: z.string().nullable().optional(),
  key: z.string().nullable(),
  isFolder: z.boolean().optional(),
  isLabel: z.boolean().optional(),
  totalCount: z.number(),
  unreadCount: z.number(),
});

const emailAttachmentSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  name: z.string(),
  size: z.string().optional(),
  sizeBytes: z.number().nonnegative().optional(),
  mimeType: z.string().nullable().optional(),
  inline: z.boolean().optional(),
  contentId: z.string().nullable().optional(),
  contentUrl: z.string().optional(),
});

/**
 * `source: 'custom'` is one of Elli's own tags — writable, created here.
 * `source: 'provider'` is an Outlook/Gmail category shown read-only, because
 * the client files their own mail with those. See zubblehq/elli-ui#652.
 */
const emailTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  source: z.enum(['custom', 'provider']),
  readOnly: z.boolean(),
});

const emailAddressSchema = z.object({
  address: z.string(),
  name: z.string().optional(),
});

const emailMeetingResponseSchema = z.object({
  status: z.enum(['accepted', 'tentative', 'declined', 'cancelled']),
  responderName: z.string(),
  responderEmail: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  eventType: z.string().optional(),
});

const emailMeetingEventResponseSchema = z.enum([
  'none',
  'organizer',
  'tentative',
  'accepted',
  'declined',
  'notResponded',
]);

const emailMeetingEventSchema = z.object({
  id: z.string(),
  iCalUId: z.string().optional(),
  subject: z.string(),
  isOrganizer: z.boolean(),
  isCancelled: z.boolean(),
  responseRequested: z.boolean(),
  responseStatus: emailMeetingEventResponseSchema,
  allowNewTimeProposals: z.boolean(),
  startAt: z.string(),
  endAt: z.string(),
  location: z.string().optional(),
  joinUrl: z.string().url().optional(),
  webLink: z.string().url().optional(),
  eventType: z.string().optional(),
  organizerName: z.string().optional(),
  organizerEmail: z.string().optional(),
  attendees: z.array(
    z.object({
      name: z.string(),
      email: z.string(),
      type: z.string().optional(),
      response: emailMeetingEventResponseSchema,
    })
  ),
});

const emailReferenceTypeSchema = z.enum([
  'project',
  'rfq',
  'rfi',
  'purchaseOrder',
  'changeOrder',
  'invoice',
  'other',
]);

const emailReferenceEntityTypeSchema = z.enum([
  'project',
  'rfq',
  'purchaseOrder',
  'primeChangeOrder',
  'subChangeOrder',
  'invoice',
]);

const emailThreadReferenceSchema = z.object({
  id: z.string().optional(),
  type: emailReferenceTypeSchema,
  entityType: emailReferenceEntityTypeSchema.nullable().optional(),
  entityId: z.string().nullable().optional(),
  label: z.string(),
  sortOrder: z.number().optional(),
});

const emailThreadAssigneeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable().optional(),
});

const emailThreadClassificationSchema = z.object({
  id: z.string().nullable().optional(),
  conversationKey: z.string(),
  threadId: z.string().nullable().optional(),
  status: z.enum(['open', 'open_our_court', 'open_their_court', 'closed']),
  /** When the thread was pinned to the top of the mailbox, or null. */
  pinnedAt: z.string().nullable().optional(),
  assignedTo: emailThreadAssigneeSchema.nullable().optional(),
  references: z.array(emailThreadReferenceSchema),
});

const emailReferenceOptionSchema = z.object({
  type: emailReferenceTypeSchema,
  entityType: emailReferenceEntityTypeSchema.nullable(),
  entityId: z.string().nullable(),
  label: z.string(),
  meta: z.string().nullable(),
});

const emailReferenceProjectSchema = z.object({
  entityId: z.string(),
  jobNumber: z.string().nullable(),
  name: z.string(),
  label: z.string(),
  mailCount: z.number().int().nonnegative(),
});

export const emailListItemSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  threadId: z.string().nullable().optional(),
  conversationKey: z.string().optional(),
  senderName: z.string(),
  senderEmail: z.string(),
  /**
   * The primary recipient, which is what labels a Sent or Drafts row — there
   * the sender is the account holder on every line (elli-ui#1115).
   *
   * Optional because the two repos deploy separately: a client that ships
   * ahead of the API would otherwise throw on every row rather than fall back
   * to the sender. `emailRowCorrespondent` handles them being absent.
   */
  recipientName: z.string().optional(),
  recipientEmail: z.string().optional(),
  recipientCount: z.number().int().nonnegative().optional(),
  subject: z.string(),
  preview: z.string(),
  receivedAt: z.string(),
  folderId: z.string().nullable().optional(),
  folder: z.string(),
  mailbox: z.string(),
  unread: z.boolean(),
  flagged: z.boolean().optional(),
  to: z.array(emailAddressSchema).optional(),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  // Provider categories, read-only.
  keywords: z.array(z.string()).optional(),
  // Elli's own tags applied to this message.
  tags: z.array(z.string()).optional(),
  meetingResponse: emailMeetingResponseSchema.optional(),
  meetingEvent: emailMeetingEventSchema.optional(),
  // Known before the count is: a shared-mailbox row can raise the flag while
  // `attachmentCount` is still 0, until elli-core lists its files.
  hasAttachments: z.boolean().optional(),
  attachmentCount: z.number().optional(),
  threadMessageCount: z.number().optional(),
  body: z.array(z.string()).optional(),
  attachments: z.array(emailAttachmentSchema).optional(),
  classification: emailThreadClassificationSchema.optional(),
});

const emailThreadMessageSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  senderName: z.string(),
  senderEmail: z.string(),
  recipientName: z.string(),
  recipientEmail: z.string(),
  to: z.array(emailAddressSchema).optional(),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  sentAt: z.string(),
  folderId: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  meetingResponse: emailMeetingResponseSchema.optional(),
  meetingEvent: emailMeetingEventSchema.optional(),
  body: z.array(z.string()),
  /**
   * The server left this message's body out because the conversation was too
   * large to send whole — the card fetches it when the reader expands it. Only
   * ever set on the outliers: 2.5MB and 9.3MB threads, against a 296kB p95.
   * See `elli-core/src/modules/email/internal/conversation-bodies.ts`.
   */
  bodyPending: z.boolean().optional(),
  /**
   * The provider's own snippet, sent in place of a deferred body so the
   * collapsed card still has a line to show.
   */
  preview: z.string().optional(),
  attachments: z.array(emailAttachmentSchema).optional(),
});

const emailMessageBodySchema = z.object({
  id: z.string(),
  body: z.array(z.string()),
});

const emailReplyResponseSchema = z.object({
  message: emailThreadMessageSchema.nullable().optional(),
});

const emailDraftResultSchema = z.object({
  draftId: z.string(),
  messageId: z.string(),
  message: emailListItemSchema.nullable(),
});

const emailAuthStartSchema = z.object({
  authorizationUrl: z.string().url(),
});

const emailConfigSchema = z.object({
  enabledProviders: z.array(z.enum(['gmail', 'outlook', 'zoho'])),
  maxPersonalAccounts: z.number().int().nonnegative(),
});

const emailListResponseSchema = z.object({
  records: z.array(emailListItemSchema),
  nextPageToken: z.string().nullable().optional(),
  pageSize: z.number().optional(),
  totalCount: z.number().int().nonnegative().nullable().optional(),
  freshness: emailFreshnessSchema.optional(),
});

const emailSyncResultSchema = z.object({
  synced: z.boolean(),
  status: z.enum(['ready', 'partial']),
  processed: z.number(),
  hasMore: z.boolean(),
  lastSyncedAt: z.string().nullable(),
});

export type EmailAccount = z.infer<typeof emailAccountSchema>;
export type ConnectedEmailFolder = z.infer<typeof emailFolderSchema>;
export type ConnectedEmailListItem = z.infer<typeof emailListItemSchema>;
export type ConnectedEmailThreadMessage = z.infer<typeof emailThreadMessageSchema>;
export type ConnectedEmailTag = z.infer<typeof emailTagSchema>;
export type EmailFreshness = z.infer<typeof emailFreshnessSchema>;
export type EmailSyncResult = z.infer<typeof emailSyncResultSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type EmailThreadReference = z.infer<typeof emailThreadReferenceSchema>;
export type EmailThreadClassification = z.infer<typeof emailThreadClassificationSchema>;
export type EmailReferenceOption = z.infer<typeof emailReferenceOptionSchema>;
export type EmailReferenceProject = z.infer<typeof emailReferenceProjectSchema>;
export type { EmailProvider } from '@/modules/email/constants/email-providers';
export type StartEmailAuthInput = {
  provider: EmailProvider;
  loginHint?: string;
  sharedMailboxKey?: SharedMailboxKey;
};
export type SharedMailboxKey = string;
export type EmailMeetingEvent = z.infer<typeof emailMeetingEventSchema>;
export type EmailMeetingResponseAction = 'accepted' | 'tentative' | 'declined';
export type UpdateEmailAccountNicknameInput = {
  accountId: string;
  nickname: string;
};
export type EmailMessagePage = {
  records: ConnectedEmailListItem[];
  nextPageToken: string | null;
  pageSize?: number;
  totalCount?: number | null;
  freshness?: EmailFreshness;
};

export type EmailDraftMessagePayload = {
  accountId: string;
  draftId?: string;
  messageId?: string;
  subject: string;
  body: string;
  bodyType?: 'html' | 'text';
  to: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  bcc?: Array<{ address: string; name?: string }>;
  attachments?: Array<{
    name: string;
    mimeType?: string;
    content: string;
  }>;
  removedAttachmentIds?: string[];
  /** Lets the composer abandon an upload the user cancelled. */
  signal?: AbortSignal;
  /**
   * Reports bytes sent so the composer can show real progress. The payload is
   * base64, so a 25 MB message is ~33 MB on the wire and takes as long as the
   * uplink takes — an indeterminate "Preparing…" for that long reads as a hang.
   */
  onUploadProgress?: (event: AxiosProgressEvent) => void;
  /**
   * This save is only adding files, so the draft's fields do not need writing
   * back. Routes to the attach endpoint — see `saveDraft`.
   */
  attachOnly?: boolean;
};

/**
 * Draft saves carry base64 attachments, so they need far longer than the
 * client's default 30s — but never an unbounded wait: a request that hangs
 * leaves the composer pinned on "Preparing attachments…" with no way out
 * (elli-ui#910).
 */
export const DRAFT_SAVE_TIMEOUT_MS = 120_000;

export type EmailDraftResult = z.infer<typeof emailDraftResultSchema>;

export type SendConnectedEmailPayload = {
  accountId: string;
  subject: string;
  body: string;
  bodyType?: 'html' | 'text';
  to: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  bcc?: Array<{ address: string; name?: string }>;
  attachments?: Array<{
    name: string;
    mimeType?: string;
    content: string;
  }>;
};

export type ReplyConnectedEmailPayload = {
  accountId: string;
  messageId: string;
  body: string;
  bodyType?: 'html' | 'text';
  subject?: string;
  to?: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  bcc?: Array<{ address: string; name?: string }>;
  /**
   * elli-core has always accepted these — `ReplyMessageSchema` and
   * `ForwardMessageSchema` both extend `SendMessageSchema`, and the service
   * passes them straight to the provider. Only this type omitted them, so the
   * composer had nowhere to put a file (elli-ui#1018).
   */
  attachments?: Array<{
    name: string;
    mimeType?: string;
    content: string;
  }>;
};

export type ForwardConnectedEmailPayload = {
  accountId: string;
  messageId: string;
  body: string;
  bodyType?: 'html' | 'text';
  subject?: string;
  to: Array<{ address: string; name?: string }>;
  cc?: Array<{ address: string; name?: string }>;
  bcc?: Array<{ address: string; name?: string }>;
  /**
   * elli-core has always accepted these — `ReplyMessageSchema` and
   * `ForwardMessageSchema` both extend `SendMessageSchema`, and the service
   * passes them straight to the provider. Only this type omitted them, so the
   * composer had nowhere to put a file (elli-ui#1018).
   */
  attachments?: Array<{
    name: string;
    mimeType?: string;
    content: string;
  }>;
};

export type SaveEmailThreadClassificationPayload = {
  accountId: string;
  conversationKey: string;
  threadId?: string | null;
  status: EmailThreadClassification['status'];
  assignedToId?: string | null;
  references: EmailThreadReference[];
};

// A message found by searching the whole mailbox, for referencing rather than
// reading — so no body, no flags, just enough to recognise the thread.
export const emailMessageSearchResultSchema = z.object({
  providerId: z.string(),
  threadId: z.string().nullable().optional(),
  conversationKey: z.string(),
  subject: z.string(),
  senderName: z.string(),
  senderEmail: z.string(),
  preview: z.string(),
  receivedAt: z.string(),
  folder: z.string(),
});

export type EmailMessageSearchResult = z.infer<typeof emailMessageSearchResultSchema>;

// A row from across every mailbox names the one it is in - the caller did not.
export const emailMessageAcrossAccountsResultSchema = emailMessageSearchResultSchema.extend({
  accountId: z.string(),
});

export type EmailMessageAcrossAccountsResult = z.infer<
  typeof emailMessageAcrossAccountsResultSchema
>;

export type EmailThreadAssignee = z.infer<typeof emailThreadAssigneeSchema>;

function unwrapData<T>(data: unknown, key = 'data'): T {
  const response = data as Record<string, unknown>;
  return (response?.[key] ?? response) as T;
}

export const emailApi = {
  async getConfig(): Promise<EmailConfig> {
    const res = await api.get(`${BASE}/config`);
    return emailConfigSchema.parse(unwrapData(res.data));
  },

  async listAccounts(): Promise<EmailAccount[]> {
    const res = await api.get(`${BASE}/accounts`);
    return dedupeEmailAccounts(z.array(emailAccountSchema).parse(unwrapData(res.data)));
  },

  async disconnectAccount(accountId: string): Promise<void> {
    await api.delete(`${BASE}/accounts/${accountId}`);
  },

  async updateAccountNickname(input: UpdateEmailAccountNicknameInput): Promise<EmailAccount> {
    const res = await api.patch(`${BASE}/accounts/${input.accountId}/nickname`, {
      nickname: input.nickname,
    });
    return emailAccountSchema.parse(unwrapData(res.data));
  },

  async startAuth(input: StartEmailAuthInput): Promise<{ authorizationUrl: string }> {
    const res = await api.get(`${BASE}/auth/start`, {
      params: {
        provider: input.provider,
        loginHint: input.loginHint,
        sharedMailboxKey: input.sharedMailboxKey,
        redirectTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      },
    });
    return emailAuthStartSchema.parse(unwrapData(res.data));
  },

  async listFolders(accountId: string): Promise<ConnectedEmailFolder[]> {
    const res = await api.get(`${BASE}/accounts/${accountId}/folders`);
    return z.array(emailFolderSchema).parse(unwrapData(res.data));
  },

  async listTags(accountId: string): Promise<ConnectedEmailTag[]> {
    const res = await api.get(`${BASE}/accounts/${accountId}/tags`);
    return z.array(emailTagSchema).parse(unwrapData(res.data));
  },

  async listReferenceOptions(params: {
    accountId: string;
    type: EmailThreadReference['type'];
    search?: string;
    projectId?: string;
    size?: number;
  }): Promise<EmailReferenceOption[]> {
    const res = await api.get(`${BASE}/accounts/${params.accountId}/references/options`, {
      params: {
        type: params.type,
        search: params.search || undefined,
        projectId: params.projectId || undefined,
        size: params.size ?? 20,
      },
    });
    return z.array(emailReferenceOptionSchema).parse(unwrapData(res.data));
  },

  async listReferenceProjects(
    accountId: string,
    // The counts are per folder, because the list they label is (elli-ui#1117).
    folder?: { key?: EmailFolderKey; id?: string }
  ): Promise<EmailReferenceProject[]> {
    const res = await api.get(`${BASE}/accounts/${accountId}/reference-projects`, {
      params: { folderKey: folder?.key, folderId: folder?.id },
    });
    return z.array(emailReferenceProjectSchema).parse(unwrapData(res.data));
  },

  /**
   * Pin or unpin one thread (elli-ui#1034).
   *
   * Its own endpoint, not a field on the classification save: that one writes
   * the status, the assignee and the whole reference list together, so a pin
   * routed through it would rewrite everything else filed against the thread.
   */
  async setThreadPinned(payload: {
    accountId: string;
    conversationKey: string;
    threadId?: string | null;
    pinned: boolean;
  }): Promise<EmailThreadClassification> {
    const { accountId, ...pin } = payload;
    const res = await api.put(`${BASE}/accounts/${accountId}/thread-pin`, pin);
    return emailThreadClassificationSchema.parse(unwrapData(res.data));
  },

  /**
   * Every pinned thread in a mailbox, newest pin first.
   *
   * Separate from the folder page on purpose: a pin means "keep this where I
   * can see it", and the thread most worth pinning is the one that has already
   * fallen several pages down.
   */
  async listPinnedThreads(params: {
    accountId: string;
    folderId?: string | null;
  }): Promise<ConnectedEmailListItem[]> {
    const res = await api.get(`${BASE}/accounts/${params.accountId}/pinned-threads`, {
      params: { folderId: params.folderId || undefined },
    });
    return z.array(emailListItemSchema).parse(unwrapData(res.data));
  },

  async saveThreadClassification(
    payload: SaveEmailThreadClassificationPayload
  ): Promise<EmailThreadClassification> {
    const { accountId, ...classification } = payload;
    const res = await api.put(
      `${BASE}/accounts/${accountId}/thread-classification`,
      classification
    );
    return emailThreadClassificationSchema.parse(unwrapData(res.data));
  },

  /**
   * Find a message anywhere in the mailbox, Junk aside.
   *
   * Deliberately not `listMessages` with a search term: that one is scoped to a
   * folder, and the whole point here is that you do not know which folder the
   * message is in.
   */
  async searchMessages(params: {
    accountId: string;
    q: string;
    size?: number;
    signal?: AbortSignal;
  }): Promise<EmailMessageSearchResult[]> {
    const res = await api.get(`${BASE}/accounts/${params.accountId}/messages/search`, {
      params: { q: params.q, size: params.size ?? 20 },
      signal: params.signal,
    });
    return z.array(emailMessageSearchResultSchema).parse(unwrapData(res.data));
  },

  /**
   * Recent or matching mail across every mailbox at once, for a picker that
   * does not know which one holds the message. No term means the newest inbox
   * mail. Served from the server's cache alone - one request however many
   * mailboxes there are - so a message newer than the last sync is found by
   * searching its own mailbox.
   */
  async searchMessagesAcrossAccounts(params: {
    q?: string;
    size?: number;
    signal?: AbortSignal;
  }): Promise<EmailMessageAcrossAccountsResult[]> {
    const res = await api.get(`${BASE}/messages/search`, {
      params: { q: params.q || undefined, size: params.size ?? 25 },
      signal: params.signal,
    });
    return z.array(emailMessageAcrossAccountsResultSchema).parse(unwrapData(res.data));
  },

  async listThreadAssignees(): Promise<EmailThreadAssignee[]> {
    const res = await api.get(`${BASE}/thread-assignees`);
    return z.array(emailThreadAssigneeSchema).parse(unwrapData(res.data));
  },

  async listMessages(params: {
    accountId: string;
    folderKey?: EmailFolderKey;
    folderId?: string;
    pageToken?: string;
    size?: number;
    search?: string;
    projectId?: string;
    classification?: 'other';
    // Answered from the whole cached folder server-side (elli-ui#859) rather
    // than filtered against whatever page happens to already be loaded — a
    // mailbox with more unread/flagged/attachment mail than one page holds
    // would otherwise show only a few of them.
    unread?: boolean;
    flagged?: boolean;
    hasAttachments?: boolean;
    signal?: AbortSignal;
  }): Promise<EmailMessagePage> {
    const res = await api.get(`${BASE}/accounts/${params.accountId}/messages`, {
      params: {
        folderKey: params.folderKey,
        folderId: params.folderId,
        pageToken: params.pageToken,
        size: params.size ?? 100,
        search: params.search || undefined,
        projectId: params.projectId || undefined,
        classification: params.classification,
        unread: params.unread || undefined,
        flagged: params.flagged || undefined,
        hasAttachments: params.hasAttachments || undefined,
      },
      signal: params.signal,
    });
    const parsed = emailListResponseSchema.parse(unwrapData(res.data));
    return {
      records: parsed.records,
      nextPageToken: parsed.nextPageToken ?? null,
      pageSize: parsed.pageSize,
      totalCount: parsed.totalCount ?? null,
      freshness: parsed.freshness,
    };
  },

  // daysWithin only matters for an account's very first sync (it seeds
  // Aurinko's delta tracker; every later call ignores it entirely and just
  // walks that tracker forward — see DEFAULT_SYNC_DAYS in elli-core's
  // service.ts). Leave it unset by default so the backend's own default
  // window applies instead of silently overriding it with a stale value here.
  async syncAccount(accountId: string, daysWithin?: number): Promise<EmailSyncResult> {
    const res = await api.post(`${BASE}/accounts/${accountId}/sync`, undefined, {
      params: daysWithin ? { daysWithin } : undefined,
    });
    return emailSyncResultSchema.parse(unwrapData(res.data));
  },

  async getMessage(accountId: string, messageId: string): Promise<ConnectedEmailListItem> {
    const res = await api.get(`${BASE}/accounts/${accountId}/messages/${messageId}`);
    return emailListItemSchema.parse(unwrapData(res.data, 'message'));
  },

  async getDraft(accountId: string, messageId: string): Promise<EmailDraftResult> {
    const res = await api.get(`${BASE}/accounts/${accountId}/drafts/${messageId}`);
    return emailDraftResultSchema.parse(unwrapData(res.data));
  },

  /**
   * `attachOnly` sends the save to the endpoint that skips the field write —
   * see `getDraftSaveTarget` for why, and why the body is the same either way.
   */
  async saveDraft(payload: EmailDraftMessagePayload): Promise<EmailDraftResult> {
    const { accountId, draftId, signal, onUploadProgress, attachOnly, ...draft } = payload;
    const config = { timeout: DRAFT_SAVE_TIMEOUT_MS, signal, onUploadProgress };
    const target = getDraftSaveTarget({ accountId, draftId, attachOnly });
    const res =
      target.method === 'PUT'
        ? await api.put(target.path, draft, config)
        : await api.post(target.path, draft, config);
    return emailDraftResultSchema.parse(unwrapData(res.data));
  },

  async sendDraft(payload: {
    accountId: string;
    draftId: string;
    messageId?: string;
  }): Promise<void> {
    await api.post(`${BASE}/accounts/${payload.accountId}/drafts/${payload.draftId}/send`, {
      messageId: payload.messageId,
    });
  },

  async deleteDraft(accountId: string, draftId: string, messageId?: string): Promise<void> {
    await api.delete(`${BASE}/accounts/${accountId}/drafts/${draftId}`, {
      params: { messageId },
    });
  },

  async getAttachment(
    accountId: string,
    messageId: string,
    attachmentId: string,
    onProgress?: (progress: { loaded: number; total: number | null }) => void
  ): Promise<Blob> {
    const res = await api.get(
      `${BASE}/accounts/${accountId}/messages/${messageId}/attachments/${attachmentId}`,
      {
        responseType: 'blob',
        onDownloadProgress: onProgress
          ? (event) => onProgress({ loaded: event.loaded, total: event.total ?? null })
          : undefined,
      }
    );
    return res.data as Blob;
  },

  async listConversation(
    accountId: string,
    threadId: string,
    // Narrows the backend's answer to the conversation actually opened.
    conversationKey?: string
  ): Promise<ConnectedEmailThreadMessage[]> {
    const res = await api.get(
      `${BASE}/accounts/${accountId}/conversations/${encodeURIComponent(threadId)}/messages`,
      { params: conversationKey ? { conversationKey } : undefined }
    );
    return z.array(emailThreadMessageSchema).parse(unwrapData(res.data, 'messages'));
  },

  /**
   * The body of one message a large conversation deferred. Served from the
   * server's own cache, so this is a local read, not a provider round trip.
   */
  async getMessageBody(accountId: string, messageId: string): Promise<string[]> {
    const res = await api.get(`${BASE}/accounts/${accountId}/messages/${messageId}/body`);
    return emailMessageBodySchema.parse(unwrapData(res.data)).body;
  },

  async sendMessage(payload: SendConnectedEmailPayload): Promise<void> {
    const { accountId, ...message } = payload;
    await api.post(`${BASE}/accounts/${accountId}/messages/send`, {
      bodyType: 'html',
      cc: [],
      bcc: [],
      attachments: [],
      ...message,
    });
  },

  async replyMessage(
    payload: ReplyConnectedEmailPayload
  ): Promise<ConnectedEmailThreadMessage | null> {
    const { accountId, messageId, ...message } = payload;
    const res = await api.post(`${BASE}/accounts/${accountId}/messages/${messageId}/reply`, {
      bodyType: 'html',
      cc: [],
      bcc: [],
      attachments: [],
      ...message,
    });
    return emailReplyResponseSchema.parse(unwrapData(res.data)).message ?? null;
  },

  async listContactSuggestions(accountId: string, q: string): Promise<EmailContactSuggestion[]> {
    const res = await api.get(`${BASE}/accounts/${accountId}/contacts`, { params: { q } });
    return z.array(emailContactSuggestionSchema).parse(unwrapData(res.data));
  },

  async forwardMessage(
    payload: ForwardConnectedEmailPayload
  ): Promise<ConnectedEmailThreadMessage | null> {
    const { accountId, messageId, ...message } = payload;
    const res = await api.post(`${BASE}/accounts/${accountId}/messages/${messageId}/forward`, {
      bodyType: 'html',
      cc: [],
      bcc: [],
      attachments: [],
      ...message,
    });
    return emailReplyResponseSchema.parse(unwrapData(res.data)).message ?? null;
  },

  async createFolder(accountId: string, payload: { name: string; parentId?: string }) {
    const res = await api.post(`${BASE}/accounts/${accountId}/folders`, payload);
    return emailFolderSchema.parse(unwrapData(res.data));
  },

  async createTag(accountId: string, payload: { name: string; color?: string }) {
    const res = await api.post(`${BASE}/accounts/${accountId}/tags`, payload);
    return emailTagSchema.parse(unwrapData(res.data));
  },

  async moveMessage(accountId: string, messageId: string, folderId: string): Promise<void> {
    await api.post(`${BASE}/accounts/${accountId}/messages/${messageId}/move`, { folderId });
  },

  async archiveMessage(accountId: string, messageId: string): Promise<void> {
    await api.post(`${BASE}/accounts/${accountId}/messages/${messageId}/archive`);
  },

  async unarchiveMessage(accountId: string, messageId: string): Promise<void> {
    await api.post(`${BASE}/accounts/${accountId}/messages/${messageId}/unarchive`);
  },

  async deleteMessage(accountId: string, messageId: string): Promise<void> {
    await api.delete(`${BASE}/accounts/${accountId}/messages/${messageId}`);
  },

  async permanentlyDeleteMessage(accountId: string, messageId: string): Promise<void> {
    await api.delete(`${BASE}/accounts/${accountId}/messages/${messageId}/permanent`);
  },

  async emptyFolder(
    accountId: string,
    folderId: string
  ): Promise<{ deleted: number; failed: number }> {
    const res = await api.post(`${BASE}/accounts/${accountId}/folders/${folderId}/empty`);
    const payload = unwrapData<{ deleted?: number; failed?: number }>(res.data);
    return {
      deleted: payload.deleted ?? 0,
      failed: payload.failed ?? 0,
    };
  },

  async updateMessageTags(
    accountId: string,
    messageId: string,
    payload: { add?: string[]; remove?: string[] }
  ): Promise<void> {
    await api.patch(`${BASE}/accounts/${accountId}/messages/${messageId}/tags`, payload);
  },

  async updateMessageStatus(
    accountId: string,
    messageId: string,
    payload: { unread?: boolean; flagged?: boolean }
  ): Promise<void> {
    await api.patch(`${BASE}/accounts/${accountId}/messages/${messageId}/status`, payload);
  },

  async respondToMeeting(input: {
    accountId: string;
    messageId: string;
    response: EmailMeetingResponseAction;
    comment?: string;
    sendResponse?: boolean;
  }): Promise<EmailMeetingEvent> {
    const { accountId, messageId, ...payload } = input;
    const res = await api.post(
      `${BASE}/accounts/${accountId}/messages/${messageId}/meeting/respond`,
      payload
    );
    return emailMeetingEventSchema.parse(unwrapData<{ event: unknown }>(res.data).event);
  },

  async updateMeeting(input: {
    accountId: string;
    messageId: string;
    subject?: string;
    startAt?: string;
    endAt?: string;
    location?: string;
  }): Promise<EmailMeetingEvent> {
    const { accountId, messageId, ...payload } = input;
    const res = await api.patch(
      `${BASE}/accounts/${accountId}/messages/${messageId}/meeting`,
      payload
    );
    return emailMeetingEventSchema.parse(unwrapData<{ event: unknown }>(res.data).event);
  },

  async cancelMeeting(input: {
    accountId: string;
    messageId: string;
    comment?: string;
  }): Promise<EmailMeetingEvent> {
    const { accountId, messageId, ...payload } = input;
    const res = await api.post(
      `${BASE}/accounts/${accountId}/messages/${messageId}/meeting/cancel`,
      payload
    );
    return emailMeetingEventSchema.parse(unwrapData<{ event: unknown }>(res.data).event);
  },
};
