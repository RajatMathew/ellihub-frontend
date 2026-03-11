import z from 'zod';

// --- Enums ---

export const SCOChangeTypeEnum = z.enum([
    'UNFORESEEN_CONDITIONS',
    'DESIGN_CHANGE',
    'QUANTITY_ADJUSTMENT',
    'MATERIAL_SUBSTITUTION',
    'LABOR_ADJUSTMENT',
    'EQUIPMENT_RENTAL',
    'CREDIT',
    'BACKCHARGE',
    'SCHEDULE_ACCELERATION',
    'OTHER',
]);

export const SCOInitiatedByEnum = z.enum(['VENDOR', 'FIRM']);

export const CostCategoryEnum = z.enum([
    'MATERIALS',
    'LABOR',
    'EQUIPMENT',
    'SUBCONTRACTOR',
    'OTHER',
]);

export const ChangeOrderPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

// --- Line Items ---

export const SCOLineItemCreateSchema = z.object({
    description: z.string().min(1),
    qty: z.number(),
    unit: z.string().min(1),
    unitPrice: z.number(),
    poLineItemId: z.string().optional(),
    costCategory: CostCategoryEnum.optional(),
    costCodeId: z.string().optional(),
    notes: z.string().optional(),
});

export type SCOLineItemCreateRequest = z.infer<typeof SCOLineItemCreateSchema>;

export const SCOLineItemUpdateSchema = z
    .object({
        description: z.string().min(1),
        qty: z.number(),
        unit: z.string().min(1),
        unitPrice: z.number(),
        poLineItemId: z.string().optional().nullable(),
        costCategory: CostCategoryEnum.optional().nullable(),
        costCodeId: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

export type SCOLineItemUpdateRequest = z.infer<typeof SCOLineItemUpdateSchema>;

// --- SCO CRUD ---

export const SCOCreateSchema = z.object({
    purchaseOrderId: z.string().min(1),
    date: z.coerce.date().optional(),
    title: z.string().min(1).max(255),
    reasonForChange: z.string().optional(),
    detailedScope: z.string().optional(),
    amount: z.number(),
    scheduleImpactDays: z.number().int().optional(),
    changeType: SCOChangeTypeEnum.optional(),
    initiatedBy: SCOInitiatedByEnum,
    priority: ChangeOrderPriorityEnum.optional(),
    vendorContactName: z.string().max(255).optional(),
    vendorContactEmail: z.string().email().optional(),
    vendorReferenceNumber: z.string().max(100).optional(),
    linkedPCOId: z.string().optional(),
    rfqId: z.string().optional(),
    costCodeId: z.string().optional(),
    lineItems: z.array(SCOLineItemCreateSchema).min(1),
});

export type SCOCreateRequest = z.infer<typeof SCOCreateSchema>;

export const SCOUpdateSchema = z
    .object({
        title: z.string().min(1).max(255),
        reasonForChange: z.string().nullable(),
        detailedScope: z.string().nullable(),
        amount: z.number(),
        scheduleImpactDays: z.number().int().nullable(),
        changeType: SCOChangeTypeEnum.nullable(),
        initiatedBy: SCOInitiatedByEnum,
        priority: ChangeOrderPriorityEnum,
        vendorContactName: z.string().max(255).nullable(),
        vendorContactEmail: z.string().email().nullable(),
        vendorReferenceNumber: z.string().max(100).nullable(),
        linkedPCOId: z.string().nullable(),
        rfqId: z.string().nullable(),
        costCodeId: z.string().nullable(),
    })
    .partial();

export type SCOUpdateRequest = z.infer<typeof SCOUpdateSchema>;

// --- Workflow ---

export const RejectSchema = z.object({
    reason: z.string().min(20),
});

export type RejectRequest = z.infer<typeof RejectSchema>;

export const VoidSchema = z.object({
    reason: z.string().min(1),
});

export type VoidRequest = z.infer<typeof VoidSchema>;
