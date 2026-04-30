import z from 'zod';

export const ProjectStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'CLOSED', 'COMPLETED']);

export const PaymentTermsSchema = z.enum([
    'NET_15',
    'NET_30',
    'NET_45',
    'NET_60',
    'NET_90',
    'DUE_ON_RECEIPT',
]);

export const ProjectCreateSchema = z.object({
    name: z.string().min(2),
    description: z.string().min(1),
    jobNumber: z.string().min(1).optional().nullable(),
    contractNumber: z.string().min(1).optional().nullable(),
    fieldwireProjectId: z.uuid().optional().nullable(),
    stageId: z.ulid(),
    divisionId: z.ulid(),
    status: ProjectStatusSchema,
    streetAddress: z.string().min(1).optional().nullable(),
    city: z.string().min(1).optional().nullable(),
    state: z.string().min(1).optional().nullable(),
    zipCode: z.string().min(1).optional().nullable(),
    estimatedStartDate: z.iso.date().optional().nullable(),
    estimatedEndDate: z.iso.date().optional().nullable(),
    gcId: z.ulid(),
    leadPMId: z.ulid().optional().nullable(),
    contractValue: z.number().min(0),
    contractType: z.string().min(1).optional().nullable(),
    retainagePercent: z.number().min(0).max(100).optional().nullable(),
    targetBudgetPercent: z.number().min(0).max(100).optional().nullable(),
    taxRate: z.number().min(0).max(100).optional().nullable(),
    paymentTerms: PaymentTermsSchema.optional().nullable(),
    setInactiveDate: z.iso.date().optional().nullable(),
    tcoDate: z.iso.date().optional().nullable(),
});

export type ProjectCreateRequest = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = ProjectCreateSchema.omit({ status: true }).extend({
    id: z.ulid(),
});

export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateSchema>;

export const AddPrimeContractSchema = z.object({
    projectId: z.ulid(),
    fileId: z.ulid(),
});

export type AddPrimeContractRequest = z.infer<typeof AddPrimeContractSchema>;

export const AddTeamMemberSchema = z.object({
    projectId: z.ulid(),
    employeeId: z.ulid(),
    role: z.string().min(1),
    isLead: z.boolean().default(false),
});

export type AddTeamMemberRequest = z.infer<typeof AddTeamMemberSchema>;

export const RemoveTeamMemberSchema = z.object({
    projectId: z.ulid(),
    employeeId: z.ulid(),
});

export type RemoveTeamMemberRequest = z.infer<typeof RemoveTeamMemberSchema>;

export const AddScheduleSchema = z.object({
    projectId: z.ulid(),
    date: z.iso.date(),
    description: z.string().min(1),
    adjustedFinishDate: z.iso.date().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    fileId: z.ulid().optional().nullable(),
});

export type AddScheduleRequest = z.infer<typeof AddScheduleSchema>;

export const UpdateScheduleSchema = z.object({
    id: z.ulid(),
    date: z.iso.date(),
    description: z.string().min(1),
    adjustedFinishDate: z.iso.date().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    fileId: z.ulid().optional().nullable(),
});

export type UpdateScheduleRequest = z.infer<typeof UpdateScheduleSchema>;

export const RemoveScheduleSchema = z.object({
    id: z.ulid(),
});

export type RemoveScheduleRequest = z.infer<typeof RemoveScheduleSchema>;
