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
import {
    CreateRecurringBillRuleSchema,
    PayRecurringBillSchema,
    RecurringBillRuleParamSchema,
    RecurringBillsQuerySchema,
    SkipRecurringBillSchema,
    SkipRecurringBillMonthSchema,
    ToggleRecurringBillRuleSchema,
    UpdateRecurringBillRuleSchema,
} from './recurring-bills.models';
import { RecurringBillsService } from './recurring-bills.service';
import { MonthlyBillsService } from './service';

const app = new Hono();
const PurchaseOrderParamSchema = z.object({ purchaseOrderId: z.string() });
app.get(
    '/recurring',
    requirePermission({ monthlyBills: ['list'] }),
    zValidator('query', RecurringBillsQuerySchema),
    async (c) => {
        const access = await getAccessContext(c);
        const bills = await RecurringBillsService.listRecurringBills({
            ...c.req.valid('query'),
            userRole: access.role,
            canUpdateMonthlyBills: access.permissions.monthlyBills?.includes('update') ?? false,
            canMarkMonthlyBills: access.permissions.monthlyBills?.includes('mark-payment') ?? false,
        });
        return success(c, bills);
    }
);

app.post(
    '/recurring',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('json', CreateRecurringBillRuleSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const rule = await RecurringBillsService.createRecurringBillRule({
            ...c.req.valid('json'),
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, rule, 201);
    }
);

app.patch(
    '/recurring/:ruleId',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('param', RecurringBillRuleParamSchema),
    zValidator('json', UpdateRecurringBillRuleSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const { ruleId } = c.req.valid('param');
        const rule = await RecurringBillsService.updateRecurringBillRule({
            ...c.req.valid('json'),
            ruleId,
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, rule);
    }
);

app.patch(
    '/recurring/:ruleId/active',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('param', RecurringBillRuleParamSchema),
    zValidator('json', ToggleRecurringBillRuleSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const { ruleId } = c.req.valid('param');
        const rule = await RecurringBillsService.toggleRecurringBillRule({
            ...c.req.valid('json'),
            ruleId,
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, rule);
    }
);

app.delete(
    '/recurring/:ruleId',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('param', RecurringBillRuleParamSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const { ruleId } = c.req.valid('param');
        const rule = await RecurringBillsService.deleteRecurringBillRule({
            ruleId,
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, rule);
    }
);

app.post(
    '/recurring/:ruleId/pay',
    requirePermission({ monthlyBills: ['mark-payment'] }),
    zValidator('param', RecurringBillRuleParamSchema),
    zValidator('json', PayRecurringBillSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const { ruleId } = c.req.valid('param');
        const payment = await RecurringBillsService.payRecurringBill({
            ...c.req.valid('json'),
            ruleId,
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, payment, 201);
    }
);

app.post(
    '/recurring/:ruleId/skip-month',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('param', RecurringBillRuleParamSchema),
    zValidator('json', SkipRecurringBillMonthSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const { ruleId } = c.req.valid('param');
        const result = await RecurringBillsService.skipRecurringBillMonth({
            ...c.req.valid('json'),
            ruleId,
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, result);
    }
);
app.post(
    '/recurring/:ruleId/skip',
    requirePermission({ monthlyBills: ['update'] }),
    zValidator('param', RecurringBillRuleParamSchema),
    zValidator('json', SkipRecurringBillSchema),
    async (c) => {
        const access = await getAccessContext(c);
        const { ruleId } = c.req.valid('param');
        const occurrence = await RecurringBillsService.skipRecurringBill({
            ...c.req.valid('json'),
            ruleId,
            userRole: access.role,
            userId: c.get('user')!.id,
        });
        return success(c, occurrence);
    }
);

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
            canUpdateMonthlyBills: access.permissions.monthlyBills?.includes('update') ?? false,
            canMarkMonthlyBills: access.permissions.monthlyBills?.includes('mark-payment') ?? false,
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
