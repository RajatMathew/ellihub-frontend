import api from '@/app/api';
import type { EmailFolderKey } from '@/modules/email/constants/email-folders';
import { z } from 'zod';

const BASE = '/email';

const emailAccountSchema = z.object({
  id: z.string(),
  email: z.string(),
  mailboxAddress: z.string(),
  displayName: z.string(),
  provider: z.enum(['gmail', 'outlook']),
  status: z.string(),
  lastSyncedAt: z.string().nullable(),
  connectedById: z.string().nullable(),
});

const emailFolderSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  fullName: z.string().nullable(),
  key: z.string().nullable(),
  totalCount: z.number(),
  unreadCount: z.number(),
});

const emailAttachmentSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  name: z.string(),
  size: z.string().optional(),
  mimeType: z.string().nullable().optional(),
});

const emailListItemSchema = z.object({
  id: z.string(),
  providerId: z.string().optional(),
  threadId: z.string().nullable().optional(),
  senderName: z.string(),
  senderEmail: z.string(),
  subject: z.string(),
  preview: z.string(),
  receivedAt: z.string(),
  folder: z.string(),
  mailbox: z.string(),
  unread: z.boolean(),
  attachmentCount: z.number().optional(),
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
  body: z.array(z.string()),
  attachments: z.array(emailAttachmentSchema).optional(),
});

const emailAuthStartSchema = z.object({
  authorizationUrl: z.string().url(),
});

export type EmailAccount = z.infer<typeof emailAccountSchema>;
export type ConnectedEmailFolder = z.infer<typeof emailFolderSchema>;
export type ConnectedEmailListItem = z.infer<typeof emailListItemSchema>;
export type ConnectedEmailThreadMessage = z.infer<typeof emailThreadMessageSchema>;
export type EmailProvider = 'gmail' | 'outlook';

export type SendConnectedEmailPayload = {
  accountId: string;
  subject: string;
  body: string;
  bodyType?: 'html' | 'text';
  to: Array<{ address: string; name?: string }>;
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

  async listMessages(params: {
    accountId: string;
    folderKey: EmailFolderKey;
    refresh?: boolean;
  }): Promise<ConnectedEmailListItem[]> {
    const res = await api.get(`${BASE}/accounts/${params.accountId}/messages`, {
      params: {
        folderKey: params.folderKey,
        size: 100,
        refresh: params.refresh,
      },
    });
    return z.array(emailListItemSchema).parse(unwrapData(res.data, 'messages'));
  },

  async listConversation(accountId: string, threadId: string): Promise<ConnectedEmailThreadMessage[]> {
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
};
