import { nanoIdSchema } from '@utils/zod';
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
    fieldwireProjectName: z.string().min(1).optional().nullable(),
    stageId: nanoIdSchema,
    divisionId: nanoIdSchema,
    status: ProjectStatusSchema,
    streetAddress: z.string().min(1).optional().nullable(),
    city: z.string().min(1).optional().nullable(),
    state: z.string().min(1).optional().nullable(),
    zipCode: z.string().min(1).optional().nullable(),
    estimatedStartDate: z.iso.date().optional().nullable(),
    estimatedEndDate: z.iso.date().optional().nullable(),
    actualStartDate: z.iso.date().optional().nullable(),
    actualCompletionDate: z.iso.date().optional().nullable(),
    gcId: nanoIdSchema,
    leadPMId: nanoIdSchema,
    contractValue: z.number().min(0),
    contractType: z.string().min(1).optional().nullable(),
    retainagePercent: z.number().min(0).max(100).optional().nullable(),
    targetBudgetPercent: z.number().min(0).max(100).optional().nullable(),
    taxRate: z.number().min(0).max(100).optional().nullable(),
    paymentTerms: PaymentTermsSchema.optional().nullable(),
    setInactiveDate: z.iso.date().optional().nullable(),
    tcoDate: z.iso.date(),
});

export type ProjectCreateRequest = z.infer<typeof ProjectCreateSchema>;

export const ProjectUpdateSchema = ProjectCreateSchema.omit({ status: true }).extend({
    id: nanoIdSchema,
});

export type ProjectUpdateRequest = z.infer<typeof ProjectUpdateSchema>;

export const AddPrimeContractSchema = z.object({
    projectId: nanoIdSchema,
    fileId: nanoIdSchema,
});

export type AddPrimeContractRequest = z.infer<typeof AddPrimeContractSchema>;

export const PinPrimeContractsSchema = z.object({
    projectId: nanoIdSchema,
    fileIds: z.array(nanoIdSchema).min(1),
});

export type PinPrimeContractsRequest = z.infer<typeof PinPrimeContractsSchema>;

export const PrimeContractAttachmentParamsSchema = z.object({
    projectId: nanoIdSchema,
    primeContractId: nanoIdSchema,
});

export const UnpinPrimeContractsSchema = z.object({
    projectId: nanoIdSchema,
    primeContractIds: z.array(nanoIdSchema).min(1),
});

export const SetPrimeContractPrimarySchema = z.object({
    projectId: nanoIdSchema,
    primeContractIds: z.array(nanoIdSchema).min(1),
    isPrimary: z.boolean(),
});

export type SetPrimaryPrimeContractRequest = z.infer<typeof PrimeContractAttachmentParamsSchema>;
export type RemovePrimeContractRequest = z.infer<typeof PrimeContractAttachmentParamsSchema>;
export type UnpinPrimeContractsRequest = z.infer<typeof UnpinPrimeContractsSchema>;
export type SetPrimeContractPrimaryRequest = z.infer<typeof SetPrimeContractPrimarySchema>;

export const AddTeamMemberSchema = z.object({
    projectId: nanoIdSchema,
    employeeId: nanoIdSchema,
    role: z.enum(['Lead PM', 'PM', 'Member']).default('Member'),
    isLead: z.boolean().default(false),
});

export type AddTeamMemberRequest = z.infer<typeof AddTeamMemberSchema>;

export const RemoveTeamMemberSchema = z.object({
    projectId: nanoIdSchema,
    employeeId: nanoIdSchema,
});

export type RemoveTeamMemberRequest = z.infer<typeof RemoveTeamMemberSchema>;

export const PromoteTeamMemberSchema = z.object({
    projectId: nanoIdSchema,
    employeeId: nanoIdSchema,
});

export type PromoteTeamMemberRequest = z.infer<typeof PromoteTeamMemberSchema>;

export const UpdateTeamMemberRoleSchema = z.object({
    projectId: nanoIdSchema,
    employeeId: nanoIdSchema,
    role: z.enum(['Lead PM', 'PM', 'Member']),
});

export type UpdateTeamMemberRoleRequest = z.infer<typeof UpdateTeamMemberRoleSchema>;

export const AddScheduleSchema = z.object({
    projectId: nanoIdSchema,
    date: z.iso.date(),
    description: z.string().min(1),
    adjustedFinishDate: z.iso.date().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    fileId: nanoIdSchema.optional().nullable(),
    primeChangeOrderId: nanoIdSchema.optional().nullable(),
});

export type AddScheduleRequest = z.infer<typeof AddScheduleSchema>;

export const UpdateScheduleSchema = z.object({
    id: nanoIdSchema,
    date: z.iso.date(),
    description: z.string().min(1),
    adjustedFinishDate: z.iso.date().optional().nullable(),
    notes: z.string().min(1).optional().nullable(),
    fileId: nanoIdSchema.optional().nullable(),
    primeChangeOrderId: nanoIdSchema.optional().nullable(),
});

export type UpdateScheduleRequest = z.infer<typeof UpdateScheduleSchema>;

export const RemoveScheduleSchema = z.object({
    id: nanoIdSchema,
});

export type RemoveScheduleRequest = z.infer<typeof RemoveScheduleSchema>;

export const SetProjectMasterScheduleSchema = z.object({
    projectId: nanoIdSchema,
    fileId: nanoIdSchema,
});

export const SetProjectMasterScheduleBodySchema = SetProjectMasterScheduleSchema.omit({
    projectId: true,
});

export type SetProjectMasterScheduleRequest = z.infer<typeof SetProjectMasterScheduleSchema>;

export const RemoveProjectMasterScheduleSchema = z.object({
    projectId: nanoIdSchema,
});

export type RemoveProjectMasterScheduleRequest = z.infer<typeof RemoveProjectMasterScheduleSchema>;
