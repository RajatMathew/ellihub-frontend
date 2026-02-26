import z from 'zod';

export const ProjectCreateSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().min(1),
    jobNumber: z.string().optional(),
    contractNumber: z.string().max(100).optional(),
    stageId: z.string().min(1),
    division: z.enum(['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL']),
    statusId: z.string().min(1).optional(),
    gcId: z.string().min(1),
    leadPMId: z.string().min(1),
    streetAddress: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2).optional(),
    zipCode: z.string().optional(),
    effectiveStartDate: z.coerce.date().optional(),
    effectiveEndDate: z.coerce.date().optional(),
    contract: z
        .object({
            contractValue: z.number().positive(),
        })
        .optional(),
});

export type ProjectCreateRequest = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = z
    .object({
        name: z.string().min(1).max(255),
        description: z.string().min(1),
        contractNumber: z.string().max(100),
        stageId: z.string().min(1),
        division: z.enum(['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL']),
        statusId: z.string().min(1),
        gcId: z.string().min(1),
        leadPMId: z.string().min(1),
        streetAddress: z.string(),
        city: z.string(),
        state: z.string().max(2),
        zipCode: z.string(),
    })
    .partial();

export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateSchema>;

export const TeamMemberSchema = z.object({
    employeeId: z.string().min(1),
    role: z.string().max(100).optional(),
});

export type TeamMemberRequest = z.infer<typeof TeamMemberSchema>;

export const ScheduleEntryCreateSchema = z.object({
    date: z.coerce.date(),
    description: z.string().min(1).max(500),
    adjustedStartDate: z.coerce.date().optional(),
    adjustedFinishDate: z.coerce.date().optional(),
    notes: z.string().max(2000).optional(),
    fileId: z.string().min(1).optional(),
});

export type ScheduleEntryCreateRequest = z.infer<typeof ScheduleEntryCreateSchema>;

export const ScheduleEntryUpdateSchema = z
    .object({
        date: z.coerce.date(),
        description: z.string().min(1).max(500),
        adjustedStartDate: z.coerce.date().nullable(),
        adjustedFinishDate: z.coerce.date().nullable(),
        notes: z.string().max(2000).nullable(),
        fileId: z.string().min(1).nullable(),
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required',
    });

export type ScheduleEntryUpdateRequest = z.infer<typeof ScheduleEntryUpdateSchema>;

export const PrimeContractUpsertSchema = z.object({
    contractValue: z.number().positive(),
    contractType: z.string().max(100).optional(),
    totalContractValue: z.number().positive().optional(),
    retainagePercent: z.number().min(0).max(100).optional(),
    targetBudgetPercent: z.number().min(0).max(100).optional(),
    paymentTerms: z
        .enum(['NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90', 'DUE_ON_RECEIPT'])
        .optional(),
    estimatedStartDate: z.coerce.date().nullable().optional(),
    estimatedCompletionDate: z.coerce.date().nullable().optional(),
    actualStartDate: z.coerce.date().nullable().optional(),
    actualCompletionDate: z.coerce.date().nullable().optional(),
    executedContractDocId: z.string().min(1).nullable().optional(),
});

export type PrimeContractUpsertRequest = z.infer<typeof PrimeContractUpsertSchema>;
