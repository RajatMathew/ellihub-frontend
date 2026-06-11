import z from 'zod';

export const QUICKBOOKS_ACCOUNTING_SCOPE = 'com.intuit.quickbooks.accounting';

export const QuickBooksCallbackQuerySchema = z.object({
    code: z.string().min(1).optional(),
    state: z.string().min(1),
    realmId: z.string().min(1).optional(),
    error: z.string().min(1).optional(),
    error_description: z.string().min(1).optional(),
});

export type QuickBooksCallbackQuery = z.infer<typeof QuickBooksCallbackQuerySchema>;

export const QuickBooksDisconnectCallbackQuerySchema = z.object({
    realmId: z.string().min(1),
});

export type QuickBooksDisconnectCallbackQuery = z.infer<
    typeof QuickBooksDisconnectCallbackQuerySchema
>;
export const QuickBooksAutoDailySyncSchema = z.object({
    enabled: z.boolean(),
});

export type QuickBooksAutoDailySyncRequest = z.infer<typeof QuickBooksAutoDailySyncSchema>;

export const QuickBooksReferenceListQuerySchema = z.object({
    includeInactive: z
        .enum(['true', 'false'])
        .optional()
        .transform((value) => value === 'true'),
});

export type QuickBooksReferenceListQuery = z.infer<typeof QuickBooksReferenceListQuerySchema>;
