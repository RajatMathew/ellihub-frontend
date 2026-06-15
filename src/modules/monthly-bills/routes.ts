import { getAccessContext } from '@lib/access';
import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';
import z from 'zod';

import {
    BulkUpsertPlannedPaymentsSchema,
    MarkPaymentSchema,
    MonthlyBillsQuerySchema,
    UpsertPlannedPaymentSchema,
} from './models';
import { MonthlyBillsService } from './service';

const app = new Hono();
const PurchaseOrderParamSchema = z.object({ purchaseOrderId: z.string() });

app.get(
    '/',
    requirePermission({ monthlyBills: ['list'] }),
    zValidator('query', MonthlyBillsQuerySchema),
    async (c) => {
        const access = await getAccessContext(c);
        const query = c.req.valid('query');
        const bills = await MonthlyBillsService.listMonthlyBills({
            ...query,
            userRole: access.role,
            employeeId: access.employeeId,
        });
        return success(c, bills);
    }
);

app.get(
    '/purchase-orders/:purchaseOrderId/sub-change-orders',
    requirePermission({ monthlyBills: ['list'] }),
    zValidator('param', PurchaseOrderParamSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const { purchaseOrderId } = c.req.valid('param');
        const subChangeOrders = await MonthlyBillsService.listPurchaseOrderSubChangeOrders(
            purchaseOrderId,
            {
                userRole: access.role,
                employeeId: access.employeeId,
            }
        );
        return success(c, subChangeOrders);
    }
);

app.put(
    '/planned-payment',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('json', UpsertPlannedPaymentSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const plannedPayment = await MonthlyBillsService.upsertPlannedPayment({
            ...c.req.valid('json'),
            userRole: access.role,
            employeeId: access.employeeId,
        });
        return success(c, plannedPayment);
    }
);

app.put(
    '/planned-payments/bulk',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('json', BulkUpsertPlannedPaymentsSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const plannedPayments = await MonthlyBillsService.bulkUpsertPlannedPayments({
            ...c.req.valid('json'),
            userRole: access.role,
            employeeId: access.employeeId,
        });
        return success(c, plannedPayments);
    }
);

app.patch(
    '/mark-payment',
    requirePermission({ monthlyBills: ['mark-payment'] }),
    zValidator('json', MarkPaymentSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const payment = await MonthlyBillsService.markPayment({
            ...c.req.valid('json'),
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, payment, 201);
    }
);

export default app;
