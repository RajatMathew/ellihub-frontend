import z from 'zod';

export const PrimeChangeOrderStatusSchema = z.enum([
    'Draft',
    'Requested',
    'Pending Revision',
    'Pending Approval',
    'Approved',
    'Rejected',
    'Void',
]);

export const ScheduleImpactSchema = z.enum(['yes', 'no', 'maybe']);

export const FieldwireChangeOrderSchema = z.object({
    id: z.uuid(),
    creator_user_id: z.number().int(),
    last_editor_user_id: z.number().int(),
    project_id: z.uuid(),
    resolved_conflict: z.boolean(),
    created_at: z.string().min(1),
    updated_at: z.string().min(1),
    device_created_at: z.string().min(1),
    device_updated_at: z.string().min(1),
    deleted_at: z.string().min(1).nullable(),
    reference_number: z.string().nullable(),
    name: z.string().min(1),
    due_date: z.string().min(1).nullable(),
    pm_group_number: z.number().int().nullable(),
    total_cost: z.string().nullable(),
    revision_id: z.uuid(),
    status_name: PrimeChangeOrderStatusSchema,
    description: z.string().nullable(),
    assignee_user_id: z.number().int().nullable(),
    external_assignee_user_id: z.number().int().nullable(),
    schedule_impact: ScheduleImpactSchema.nullable(),
    schedule_impact_days: z.number().int().nullable(),
    current_revision_id: z.uuid(),
    reason_type_id: z.uuid().nullable(),
});

export const FieldwireChangeOrdersSchema = z.array(FieldwireChangeOrderSchema);

export type FieldwireChangeOrder = z.infer<typeof FieldwireChangeOrderSchema>;

export const FieldwireProjectUserSchema = z
    .object({
        id: z.number().int(),
        account_id: z.number().int().nullable().optional().default(null),
        company: z.string().nullable().optional().default(null),
        email: z.string().min(1),
        first_name: z
            .string()
            .nullable()
            .optional()
            .transform((value) => value ?? ''),
        last_name: z
            .string()
            .nullable()
            .optional()
            .transform((value) => value ?? ''),
        job_title: z.string().nullable().optional().default(null),
        phone_number: z.string().nullable().optional().default(null),
        photo_url: z.string().nullable().optional().default(null),
        role: z.string().nullable().optional().default(null),
        is_admin: z.boolean().nullable().optional().default(null),
        is_approved: z.boolean().nullable().optional().default(null),
        user_deleted_at: z.string().min(1).nullable().optional().default(null),
        project_id: z.uuid(),
        created_at: z.string().min(1),
        updated_at: z.string().min(1),
    })
    .passthrough();

export const FieldwireProjectUsersSchema = z.array(FieldwireProjectUserSchema);

export type FieldwireProjectUser = z.infer<typeof FieldwireProjectUserSchema>;
