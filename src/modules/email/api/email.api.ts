import api from '@/app/api';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import type { EmailProvider } from '@/modules/email/constants/email-providers';
import { dedupeEmailAccounts } from '@/modules/email/utils/email-account-identity';
import { z } from 'zod';

const BASE = '/email';

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

const emailTagSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  color: z.string().nullable().optional(),
  source: z.enum(['provider', 'cache']),
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

const emailThreadClassificationSchema = z.object({
  id: z.string().nullable().optional(),
  conversationKey: z.string(),
  threadId: z.string().nullable().optional(),
  status: z.enum(['open', 'closed']),
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

const emailListItemSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  threadId: z.string().nullable().optional(),
  conversationKey: z.string().optional(),
  senderName: z.string(),
  senderEmail: z.string(),
  subject: z.string(),
  preview: z.string(),
  receivedAt: z.string(),
  folderId: z.string().nullable().optional(),
  folder: z.string(),
  mailbox: z.string(),
  unread: z.boolean(),
  to: z.array(emailAddressSchema).optional(),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  keywords: z.array(z.string()).optional(),
  meetingResponse: emailMeetingResponseSchema.optional(),
  meetingEvent: emailMeetingEventSchema.optional(),
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
  meetingResponse: emailMeetingResponseSchema.optional(),
  meetingEvent: emailMeetingEventSchema.optional(),
  body: z.array(z.string()),
  attachments: z.array(emailAttachmentSchema).optional(),
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
};

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
};

export type SaveEmailThreadClassificationPayload = {
  accountId: string;
  conversationKey: string;
  threadId?: string | null;
  status: 'open' | 'closed';
  references: EmailThreadReference[];
};

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

  async listReferenceProjects(accountId: string): Promise<EmailReferenceProject[]> {
    const res = await api.get(`${BASE}/accounts/${accountId}/reference-projects`);
    return z.array(emailReferenceProjectSchema).parse(unwrapData(res.data));
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

  async listMessages(params: {
    accountId: string;
    folderKey?: EmailFolderKey;
    folderId?: string;
    pageToken?: string;
    size?: number;
    search?: string;
    projectId?: string;
    classification?: 'other';
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

  async syncAccount(accountId: string, daysWithin = 1): Promise<EmailSyncResult> {
    const res = await api.post(`${BASE}/accounts/${accountId}/sync`, undefined, {
      params: { daysWithin },
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

  async saveDraft(payload: EmailDraftMessagePayload): Promise<EmailDraftResult> {
    const { accountId, draftId, ...draft } = payload;
    const config = { timeout: 0 };
    const res = draftId
      ? await api.put(`${BASE}/accounts/${accountId}/drafts/${draftId}`, draft, config)
      : await api.post(`${BASE}/accounts/${accountId}/drafts`, draft, config);
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

  async getAttachment(accountId: string, messageId: string, attachmentId: string): Promise<Blob> {
    const res = await api.get(
      `${BASE}/accounts/${accountId}/messages/${messageId}/attachments/${attachmentId}`,
      { responseType: 'blob' }
    );
    return res.data as Blob;
  },

  async listConversation(
    accountId: string,
    threadId: string
  ): Promise<ConnectedEmailThreadMessage[]> {
    const res = await api.get(
      `${BASE}/accounts/${accountId}/conversations/${encodeURIComponent(threadId)}/messages`
    );
    return z.array(emailThreadMessageSchema).parse(unwrapData(res.data, 'messages'));
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
    payload: { unread?: boolean }
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
