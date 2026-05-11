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

export const QuickBooksTransactionsQuerySchema = z.object({
    entities: z.string().min(1).optional(),
    maxResults: z.coerce.number().int().min(1).max(25).default(5),
});

export type QuickBooksTransactionsQuery = z.infer<typeof QuickBooksTransactionsQuerySchema>;

export const QuickBooksTransactionEntitySchema = z.enum([
    'Invoice',
    'Bill',
    'Payment',
    'BillPayment',
    'Purchase',
    'PurchaseOrder',
    'SalesReceipt',
    'CreditMemo',
    'RefundReceipt',
    'VendorCredit',
    'JournalEntry',
    'Deposit',
    'Transfer',
]);

export const QUICKBOOKS_DEFAULT_TRANSACTION_ENTITIES: QuickBooksTransactionEntity[] = [
    'Invoice',
    'Bill',
    'Payment',
    'Purchase',
    'PurchaseOrder',
];

export type QuickBooksTransactionEntity = z.infer<typeof QuickBooksTransactionEntitySchema>;

export type QuickBooksTransactionPreview = {
    entity: QuickBooksTransactionEntity;
    id: string;
    docNumber: string | null;
    txnDate: string | null;
    displayName: string;
    totalAmount: number | null;
    currency: string | null;
    privateNote: string | null;
    lastUpdatedTime: string | null;
    raw: Record<string, unknown>;
};
