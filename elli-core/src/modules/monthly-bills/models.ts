import { AppRole } from '@lib/access';
import { nanoIdSchema } from '@utils/zod';
import { Decimal } from 'decimal.js';
import z from 'zod';

// Accepts a comma-separated list (e.g. ?vendorId=ab12cd34,ef56gh78) for multi-select filters.
const csvNanoIds = z
    .string()
    .transform((value) =>
        value
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
    )
    .pipe(z.array(nanoIdSchema).min(1))
    .optional();

export const MonthlyBillsQuerySchema = z.object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int(),
    search: z.string().trim().min(1).optional(),
    vendorId: csvNanoIds,
    tradeCategoryId: csvNanoIds,
});

export type MonthlyBillsQueryRequest = z.infer<typeof MonthlyBillsQuerySchema>;

export const UpsertPlannedPaymentSchema = z
    .object({
        purchaseOrderId: nanoIdSchema,
        month: z.number().int().min(1).max(12),
        year: z.number().int(),
        amount: z.number().nonnegative(),
        isReady: z.boolean().optional(),
    })
    .refine((value) => value.isReady !== true || value.amount > 0, {
        message: 'Ready bills must have a planned payment amount greater than zero.',
        path: ['isReady'],
    });

export type UpsertPlannedPaymentRequest = z.infer<typeof UpsertPlannedPaymentSchema>;

export const BulkUpsertPlannedPaymentsSchema = z.object({
    items: z.array(UpsertPlannedPaymentSchema).min(1).max(500),
});

export type BulkUpsertPlannedPaymentsRequest = z.infer<typeof BulkUpsertPlannedPaymentsSchema>;

// Full service input: validated body + role injected from the auth session.
export interface UpsertPlannedPaymentInput extends UpsertPlannedPaymentRequest {
    userRole: AppRole;
    employeeId: string | null;
}

export interface BulkUpsertPlannedPaymentsInput extends BulkUpsertPlannedPaymentsRequest {
    userRole: AppRole;
    employeeId: string | null;
}

export const MarkPaymentSchema = z.object({
    purchaseOrderId: nanoIdSchema,
    month: z.number().int().min(1).max(12),
    year: z.number().int(),
    txnDate: z.iso.date(),
    description: z.string().trim().min(1).max(4000),
    memo: z.string().trim().max(4000).optional().default(''),
    // QuickBooks reference ids (from the synced payee / bank account / category lists).
    qbVendorId: z.string().min(1),
    bankAccountId: z.string().min(1),
    categoryId: z.string().min(1),
    saveVendorMapping: z.boolean().optional().default(false),
});

export type MarkPaymentRequest = z.infer<typeof MarkPaymentSchema>;

export interface MarkPaymentInput extends Omit<MarkPaymentRequest, 'saveVendorMapping'> {
    userRole: AppRole;
    userId?: string;
    saveVendorMapping?: boolean;
}

// Full service input: validated query + identity injected from the auth session.
export interface MonthlyBillsQuery extends MonthlyBillsQueryRequest {
    userRole: AppRole;
    employeeId: string | null;
}

export interface MonthlyBillItem {
    purchaseOrder: {
        id: string;
        poNumber: string;
        vendor: {
            id: string;
            name: string;
            email?: string | null;
            phone?: string | null;
            quickBooksMapping?: {
                id: string;
                vendorId: string;
                realmId: string;
                quickBooksPayeeId: string;
                qbVendorId: string;
                displayName: string;
                companyName: string | null;
                primaryEmail: string | null;
                primaryPhone: string | null;
            } | null;
        };
        issuedAt?: Date | null;
        subChangeOrdersCount: number;
        subChangeOrders: {
            amount: Decimal;
            id: string;
            scoNumber: string;
        }[];
    };
    poTotal: Decimal;
    scoTotal: Decimal;
    original: Decimal;
    balance: Decimal;
    totalPaid: Decimal;
    plannedPayment?: {
        amount: Decimal | number;
        isReady: boolean;
    } | null;
    payments: {
        id: string;
        txnDate: Date;
        amount: Decimal;
        transactionId: string;
        transactionUrl: string;
    }[];
}

export interface MonthlyBillProjectGroup {
    project: {
        id: string;
        name: string;
        jobNumber: string | null;
    };
    bills: MonthlyBillItem[];
}
