import { nanoIdSchema } from '@utils/zod';
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

export const QuickBooksRegisterAccountParamSchema = z.object({
    accountId: z.string().min(1),
});

export type QuickBooksRegisterAccountParam = z.infer<typeof QuickBooksRegisterAccountParamSchema>;

export const QuickBooksRegisterTransactionsQuerySchema = z.object({
    startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    search: z.string().trim().max(100).optional(),
    clr: z.enum(['UNCLEARED', 'CLEARED', 'RECONCILED']).optional(),
    transactionType: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(100).default(25),
});

export type QuickBooksRegisterTransactionsQuery = z.infer<
    typeof QuickBooksRegisterTransactionsQuerySchema
>;

export const QuickBooksCreateVendorSchema = z
    .object({
        displayName: z.string().trim().min(1).max(100),
        companyName: z.string().trim().min(1).max(100).optional().nullable(),
        primaryEmail: z.email().optional().nullable(),
        primaryPhone: z.string().trim().min(1).max(50).optional().nullable(),
        vendorId: nanoIdSchema.optional(),
        saveMapping: z.boolean().optional().default(false),
    })
    .refine((value) => !value.saveMapping || Boolean(value.vendorId), {
        message: 'vendorId is required when saving a vendor mapping.',
        path: ['vendorId'],
    });

export type QuickBooksCreateVendorRequest = z.infer<typeof QuickBooksCreateVendorSchema>;

export const QuickBooksVendorMappingSchema = z.object({
    vendorId: nanoIdSchema,
    qbVendorId: z.string().min(1),
});

export type QuickBooksVendorMappingRequest = z.infer<typeof QuickBooksVendorMappingSchema>;
