import { z } from 'zod';

const ChangeOrderStatusName = z.string().min(1);
const ChangeOrderPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const LineItemCreateSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().min(1),
    qty: z.number().positive(),
    unit: z.string().min(1),
    unitPrice: z.number(),
    costCodeId: z.string().min(1).optional(),
});

export const PCOCreateSchema = z.object({
    projectId: z.string().min(1),
    date: z.coerce.date(),
    title: z.string().min(1).max(255),
    description: z.string().min(1),
    amount: z.number(),
    markupAmount: z.number().optional(),
    scheduleImpactDays: z.number().int().optional(),
    requestedBy: z.string().max(255).optional(),
    contactId: z.string().min(1).optional(),
    changeTypeId: z.string().min(1).optional(),
    priority: ChangeOrderPriorityEnum.optional(),
    impactsSchedule: z.boolean().optional(),
    estimatedCost: z.number().optional(),
    costCodeId: z.string().min(1).optional(),
    lineItems: z.array(LineItemCreateSchema).min(1),
});
export type PCOCreateRequest = z.infer<typeof PCOCreateSchema>;

export const PCOUpdateSchema = z
    .object({
        title: z.string().min(1).max(255),
        description: z.string().min(1),
        amount: z.number(),
        markupAmount: z.number().nullable(),
        scheduleImpactDays: z.number().int().nullable(),
        requestedBy: z.string().max(255).nullable(),
        contactId: z.string().min(1).nullable(),
        changeTypeId: z.string().min(1).nullable(),
        priority: ChangeOrderPriorityEnum,
        impactsSchedule: z.boolean(),
        estimatedCost: z.number().nullable(),
        costCodeId: z.string().min(1).nullable(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });
export type PCOUpdateRequest = z.infer<typeof PCOUpdateSchema>;

export const PCOStatusTransitionSchema = z.object({
    status: ChangeOrderStatusName,
    reason: z.string().max(2000).optional(),
    onBehalfOf: z.string().min(1).optional(),
});
export type PCOStatusTransitionRequest = z.infer<typeof PCOStatusTransitionSchema>;
