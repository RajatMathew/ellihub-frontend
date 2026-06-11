import { AppRole } from '@lib/access';
import { Decimal } from 'decimal.js';

export interface MonthlyBillsQuery {
    startDate: string;
    endDate: string;
    userRole: AppRole;
    employeeId: string;
    month: number;
    year: number;
}

export interface MonthlyBillItem {
    purchaseOrder: {
        id: string;
        poNumber: string;
        vendor: {
            id: string;
            name: string;
        };
        issuedAt?: Date | null;
    };
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
        transactionId: string;
        transactionUrl: string;
    }[];
}
