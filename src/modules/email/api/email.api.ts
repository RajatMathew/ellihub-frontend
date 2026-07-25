import api from '@/app/api';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
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
  provider: z.enum(['gmail', 'outlook']),
  status: z.string(),
  lastSyncedAt: z.string().nullable(),
  connectedById: z.string().nullable(),
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
  keywords: z.array(z.string()).optional(),
  attachmentCount: z.number().optional(),
  threadMessageCount: z.number().optional(),
  body: z.array(z.string()).optional(),
  attachments: z.array(emailAttachmentSchema).optional(),
});

const emailThreadMessageSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  senderName: z.string(),
  senderEmail: z.string(),
  recipientName: z.string(),
  recipientEmail: z.string(),
  sentAt: z.string(),
  folderId: z.string().nullable().optional(),
  keywords: z.array(z.string()).optional(),
  body: z.array(z.string()),
  attachments: z.array(emailAttachmentSchema).optional(),
});

const emailAuthStartSchema = z.object({
  authorizationUrl: z.string().url(),
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
export type EmailProvider = 'gmail' | 'outlook';
export type EmailMessagePage = {
  records: ConnectedEmailListItem[];
  nextPageToken: string | null;
  pageSize?: number;
  totalCount?: number | null;
  freshness?: EmailFreshness;
};

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

function unwrapData<T>(data: unknown, key = 'data'): T {
  const response = data as Record<string, unknown>;
  return (response?.[key] ?? response) as T;
}

export const emailApi = {
  async listAccounts(): Promise<EmailAccount[]> {
    const res = await api.get(`${BASE}/accounts`);
    return z.array(emailAccountSchema).parse(unwrapData(res.data));
  },

  async disconnectAccount(accountId: string): Promise<void> {
    await api.delete(`${BASE}/accounts/${accountId}`);
  },

  async startAuth(provider: EmailProvider): Promise<{ authorizationUrl: string }> {
    const res = await api.get(`${BASE}/auth/start`, {
      params: {
        provider,
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

  async listMessages(params: {
    accountId: string;
    folderKey?: EmailFolderKey;
    folderId?: string;
    pageToken?: string;
    size?: number;
    search?: string;
  }): Promise<EmailMessagePage> {
    const res = await api.get(`${BASE}/accounts/${params.accountId}/messages`, {
      params: {
        folderKey: params.folderKey,
        folderId: params.folderId,
        pageToken: params.pageToken,
        size: params.size ?? 100,
        search: params.search || undefined,
      },
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

  async replyMessage(payload: ReplyConnectedEmailPayload): Promise<void> {
    const { accountId, messageId, ...message } = payload;
    await api.post(`${BASE}/accounts/${accountId}/messages/${messageId}/reply`, {
      bodyType: 'html',
      cc: [],
      bcc: [],
      attachments: [],
      ...message,
    });
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
};
