import z from 'zod';

export const ProviderSchema = z.enum(['gmail', 'outlook']).default('gmail');

export const AuthStartQuerySchema = z.object({
    provider: ProviderSchema,
    redirectTo: z.string().trim().min(1).optional(),
    loginHint: z.string().trim().email().optional(),
});

export const AuthCallbackQuerySchema = z
    .object({
        code: z.string().trim().min(1).optional(),
        state: z.string().trim().min(1),
        error: z.string().trim().optional(),
        error_description: z.string().trim().optional(),
    })
    .passthrough();

export const AccountParamSchema = z.object({
    accountId: z.string().trim().min(1),
});

export const MessageParamSchema = AccountParamSchema.extend({
    messageId: z.string().trim().min(1),
});

export const AttachmentParamSchema = MessageParamSchema.extend({
    attachmentId: z.string().trim().min(1),
});

export const ConversationParamSchema = AccountParamSchema.extend({
    threadId: z.string().trim().min(1),
});

export const MessageListQuerySchema = z.object({
    folderKey: z
        .enum(['inbox', 'drafts', 'sent', 'deleted', 'junk', 'archive'])
        .optional()
        .default('inbox'),
    folderId: z.string().trim().min(1).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(100).default(25),
});

export const SyncQuerySchema = z.object({
    daysWithin: z.coerce.number().int().min(1).max(365).default(30),
});

export const AurinkoWebhookSchema = z
    .object({
        accountId: z.union([z.string(), z.number()]).optional(),
        subscriptionId: z.union([z.string(), z.number()]).optional(),
        subscription: z
            .object({ id: z.union([z.string(), z.number()]).optional() })
            .passthrough()
            .optional(),
    })
    .passthrough();

export type AurinkoWebhookInput = z.infer<typeof AurinkoWebhookSchema>;

const EmailAddressSchema = z.object({
    name: z.string().trim().optional(),
    address: z.string().trim().email(),
});

const AttachmentInputSchema = z.object({
    name: z.string().trim().min(1),
    mimeType: z.string().trim().optional(),
    content: z.string().trim().min(1),
    inline: z.boolean().optional(),
    contentId: z.string().trim().optional(),
});

export const SendMessageSchema = z.object({
    subject: z.string().trim().min(1),
    body: z.string().min(1),
    bodyType: z.enum(['html', 'text']).default('html'),
    to: z.array(EmailAddressSchema).min(1),
    cc: z.array(EmailAddressSchema).default([]),
    bcc: z.array(EmailAddressSchema).default([]),
    attachments: z.array(AttachmentInputSchema).default([]),
});

export const ReplyMessageSchema = SendMessageSchema.extend({
    subject: z.string().trim().min(1).optional(),
    body: z.string().min(1),
    to: z.array(EmailAddressSchema).default([]),
});

export const UpdateMessageStatusSchema = z.object({
    unread: z.boolean().optional(),
    archived: z.boolean().optional(),
    keywords: z.array(z.string().trim().min(1)).optional(),
});

export const CreateFolderSchema = z.object({
    name: z.string().trim().min(1).max(120),
    parentId: z.string().trim().min(1).optional(),
});

export const MoveMessageSchema = z.object({
    folderId: z.string().trim().min(1),
});

export const CreateTagSchema = z.object({
    name: z.string().trim().min(1).max(60),
    color: z.string().trim().min(1).optional(),
});

export const UpdateMessageTagsSchema = z.object({
    add: z.array(z.string().trim().min(1)).default([]),
    remove: z.array(z.string().trim().min(1)).default([]),
});

export type AuthStartQuery = z.infer<typeof AuthStartQuerySchema>;
export type AuthCallbackQuery = z.infer<typeof AuthCallbackQuerySchema>;
export type MessageListQuery = z.infer<typeof MessageListQuerySchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type ReplyMessageInput = z.infer<typeof ReplyMessageSchema>;
export type UpdateMessageStatusInput = z.infer<typeof UpdateMessageStatusSchema>;
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>;
export type MoveMessageInput = z.infer<typeof MoveMessageSchema>;
export type CreateTagInput = z.infer<typeof CreateTagSchema>;
export type UpdateMessageTagsInput = z.infer<typeof UpdateMessageTagsSchema>;
