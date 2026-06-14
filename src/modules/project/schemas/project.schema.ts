import { z } from 'zod';

import { paymentTermsSchema, primeContractSchema } from './project-contract.schema';
import { projectScheduleEntrySchema } from './project-schedule.schema';
import {
  projectStatusSchema,
  ProjectStatusSchema,
  type ProjectStatusEnum,
} from './project-status.schema';
import { projectTeamAssignmentSchema } from './project-team.schema';

export const divisionSchema = z.enum(['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL']);

export const lookupRefSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    label: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();

export type Division = z.infer<typeof divisionSchema>;
export type { ProjectStatusEnum };

export const projectListItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    jobNumber: z.string().nullable().optional(),
    contractNumber: z.string().nullable().optional(),
    fieldwireProjectId: z.string().nullable().optional(),
    fieldwireProjectName: z.string().nullable().optional(),
    divisionId: z.string().nullable().optional(),
    division: lookupRefSchema.nullable().optional(),
    stageId: z.string(),
    stage: lookupRefSchema.nullable().optional(),
    description: z.string(),
    status: ProjectStatusSchema.nullable().optional(),
    statusRef: projectStatusSchema.nullable().optional(),
    contractValue: z.coerce.number().optional(),
    contractType: z.string().nullable().optional(),
    approvedChangeOrdersCount: z.coerce.number().optional(),
    approvedChangeOrdersTotal: z.coerce.number().optional(),
    revisedContractValue: z.coerce.number().optional(),
    totalPOCommitted: z.coerce.number().optional(),
    activePOsCount: z.coerce.number().optional(),
    approvedSCOsCount: z.coerce.number().optional(),
    approvedSCOTotal: z.coerce.number().optional(),
    totalSpent: z.coerce.number().optional(),
    budgetLimit: z.coerce.number().optional(),
    budgetRemaining: z.coerce.number().optional(),
    spendUtilization: z.coerce.number().optional(),
    retainagePercent: z.coerce.number().optional(),
    targetBudgetPercent: z.coerce.number().optional(),
    taxRate: z.coerce.number().optional(),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    streetAddress: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    estimatedStartDate: z.string().nullable().optional(),
    estimatedEndDate: z.string().nullable().optional(),
    actualStartDate: z.string().nullable().optional(),
    actualCompletionDate: z.string().nullable().optional(),
    setInactiveDate: z.string().nullable().optional(),
    tcoDate: z.string().nullable().optional(),
    gc: z.object({ id: z.string(), name: z.string() }).passthrough().nullable().optional(),
    leadPM: z
      .object({ id: z.string(), name: z.string(), email: z.string().nullable().optional() })
      .passthrough()
      .nullable()
      .optional(),
    primeContract: z
      .object({ contractValue: z.coerce.number() })
      .passthrough()
      .nullable()
      .optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

const projectActionCapabilitiesSchema = z
  .object({
    projectTeam: z
      .object({
        add: z.boolean().optional(),
        remove: z.boolean().optional(),
        promote: z.boolean().optional(),
        'assign-role': z.boolean().optional(),
        'transfer-lead': z.boolean().optional(),
        removeMember: z.boolean().optional(),
        removePM: z.boolean().optional(),
        removeLeadPM: z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .default({}),
    primeContract: z
      .object({
        read: z.boolean().optional(),
        pin: z.boolean().optional(),
        unpin: z.boolean().optional(),
        primary: z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .default({}),
    rfq: z
      .object({
        create: z.boolean().optional(),
        update: z.boolean().optional(),
        delete: z.boolean().optional(),
        state: z.boolean().optional(),
        award: z.boolean().optional(),
        unaward: z.boolean().optional(),
        void: z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .default({}),
    purchaseOrder: z
      .object({
        create: z.boolean().optional(),
        update: z.boolean().optional(),
        delete: z.boolean().optional(),
        state: z.boolean().optional(),
        issue: z.boolean().optional(),
        deliver: z.boolean().optional(),
        cancel: z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .default({}),
    subChangeOrder: z
      .object({
        create: z.boolean().optional(),
        update: z.boolean().optional(),
        delete: z.boolean().optional(),
        state: z.boolean().optional(),
        approve: z.boolean().optional(),
        reject: z.boolean().optional(),
        void: z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .default({}),
    invoice: z
      .object({
        create: z.boolean().optional(),
        update: z.boolean().optional(),
        delete: z.boolean().optional(),
        state: z.boolean().optional(),
        'mark-paid': z.boolean().optional(),
        'mark-unpaid': z.boolean().optional(),
        dispute: z.boolean().optional(),
        'resolve-dispute': z.boolean().optional(),
      })
      .passthrough()
      .optional()
      .default({}),
  })
  .passthrough()
  .optional()
  .default({});

export const projectDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    jobNumber: z.string().nullable().optional(),
    contractNumber: z.string().nullable().optional(),
    fieldwireProjectId: z.string().nullable().optional(),
    fieldwireProjectName: z.string().nullable().optional(),
    description: z.string(),
    stageId: z.string(),
    divisionId: z.string().nullable().optional(),
    division: lookupRefSchema.nullable().optional(),
    status: ProjectStatusSchema.nullable().optional(),
    statusId: z.string().nullable().optional(),
    gcId: z.string(),
    leadPMId: z.string().nullable().optional(),
    contractValue: z.coerce.number().optional(),
    contractType: z.string().nullable().optional(),
    retainagePercent: z.coerce.number().optional(),
    targetBudgetPercent: z.coerce.number().optional(),
    taxRate: z.coerce.number().optional(),
    paymentTerms: paymentTermsSchema.nullable().optional(),
    streetAddress: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zipCode: z.string().nullable().optional(),
    estimatedStartDate: z.string().nullable().optional(),
    estimatedEndDate: z.string().nullable().optional(),
    actualStartDate: z.string().nullable().optional(),
    actualCompletionDate: z.string().nullable().optional(),
    setInactiveDate: z.string().nullable().optional(),
    tcoDate: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    stage: lookupRefSchema.nullable().optional(),
    statusRef: projectStatusSchema.nullable().optional(),
    gc: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    leadPM: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().nullable().optional(),
        phoneNumber: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    primeContract: primeContractSchema.nullable().optional(),
    projectScheduleEntries: z.array(projectScheduleEntrySchema).optional().default([]),
    teamMembers: z.array(projectTeamAssignmentSchema).optional().default([]),
    currentUserProjectRole: z.string().nullable().optional(),
    capabilities: z
      .object({
        canManage: z.boolean().optional().default(false),
        canEdit: z.boolean().optional().default(false),
        canCreateProjectDocuments: z.boolean().optional().default(false),
        canManageTeam: z.boolean().optional().default(false),
        actions: projectActionCapabilitiesSchema,
      })
      .optional()
      .default({}),
  })
  .passthrough();

export type ProjectDetail = z.infer<typeof projectDetailSchema>;

export const fieldwireProjectOptionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    accountId: z.coerce.number(),
    linkedProject: z
      .object({
        id: z.string(),
        name: z.string(),
        jobNumber: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export type FieldwireProjectOption = z.infer<typeof fieldwireProjectOptionSchema>;
export const projectPaginatedResponseSchema = z.object({
  data: z.array(projectListItemSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type ProjectPaginatedResponse = z.infer<typeof projectPaginatedResponseSchema>;

export const projectStatusStatsItemSchema = z.object({
  id: ProjectStatusSchema,
  label: z.string(),
  count: z.coerce.number(),
  totalContractValue: z.coerce.number(),
});

export const projectDivisionStatsItemSchema = z.object({
  id: z.string().nullable(),
  label: z.string(),
  count: z.coerce.number(),
  totalContractValue: z.coerce.number(),
});

export const projectStatsSchema = z.object({
  totalProjects: z.coerce.number(),
  totalContractValue: z.coerce.number(),
  statusSummary: z.array(projectStatusStatsItemSchema),
  divisionSummary: z.array(projectDivisionStatsItemSchema),
});

export type ProjectStatusStatsItem = z.infer<typeof projectStatusStatsItemSchema>;
export type ProjectDivisionStatsItem = z.infer<typeof projectDivisionStatsItemSchema>;
export type ProjectStats = z.infer<typeof projectStatsSchema>;

export const createProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().min(1, 'Description is required'),
  jobNumber: z.string().optional(),
  contractNumber: z.string().max(100).optional(),
  fieldwireProjectId: z.string().optional().nullable(),
  fieldwireProjectName: z.string().optional().nullable(),
  stageId: z.string().min(1, 'Stage is required'),
  divisionId: z.string().min(1, 'Division is required'),
  status: ProjectStatusSchema.default('ACTIVE'),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  estimatedStartDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  actualStartDate: z.string().nullable().optional(),
  actualCompletionDate: z.string().nullable().optional(),
  gcId: z.string().min(1, 'GC is required'),
  leadPMId: z.string().optional(),
  contractValue: z.number().optional().default(0),
  contractType: z.string().optional(),
  retainagePercent: z.number().optional().default(0),
  targetBudgetPercent: z.number().optional().default(0),
  taxRate: z.number().optional().default(0),
  paymentTerms: z.string().optional(),
  setInactiveDate: z.string().nullable().optional(),
  tcoDate: z.string().min(1, 'TCO date is required'),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const listProjectsParamsSchema = z.object({
  search: z.string().optional(),
  statusId: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  division: divisionSchema.optional(),
  stageId: z.string().optional(),
  gcId: z.string().optional(),
  leadPMId: z.string().optional(),
  year: z.number().optional(),
  page: z.number().min(1).optional(),
  size: z.number().min(1).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListProjectsParams = z.infer<typeof listProjectsParamsSchema>;

/* ---- Form schema (flat shape for react-hook-form) ---- */

export const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().min(1, 'Description is required'),
  jobNumber: z.string().optional(),
  contractNumber: z.string().optional(),
  fieldwireProjectId: z.string().optional().default(''),
  fieldwireProjectName: z.string().optional().default(''),
  stageId: z.string().min(1, 'Project stage is required'),
  status: ProjectStatusSchema.default('ACTIVE'),
  divisionId: z.string().min(1, 'Division is required'),
  gcId: z.string().min(1, 'General contractor is required'),
  leadPMId: z.string().min(1, 'Lead PM is required'),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  contractValue: z.coerce.number().min(0).optional().default(0),
  contractType: z.string().optional().default(''),
  retainagePercent: z.coerce.number().min(0).max(100).optional().default(0),
  targetBudgetPercent: z.coerce.number().min(0).max(100).optional().default(0),
  taxRate: z.coerce.number().min(0).max(100).optional().default(0),
  paymentTerms: z.string().optional().default(''),
  estimatedStartDate: z.string().optional().default(''),
  estimatedEndDate: z.string().optional().default(''),
  actualStartDate: z.string().optional().default(''),
  actualCompletionDate: z.string().optional().default(''),
  setInactiveDate: z.string().optional().default(''),
  tcoDate: z.string().min(1, 'TCO date is required'),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/* ---- Update schema (all fields optional, partial update) ---- */

export const updateProjectInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  jobNumber: z.string().optional(),
  contractNumber: z.string().max(100).optional(),
  fieldwireProjectId: z.string().optional().nullable(),
  fieldwireProjectName: z.string().optional().nullable(),
  stageId: z.string().min(1).optional(),
  divisionId: z.string().min(1).optional(),
  status: ProjectStatusSchema.optional(),
  gcId: z.string().min(1).optional(),
  leadPMId: z.string().min(1).optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  estimatedStartDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
  actualStartDate: z.string().nullable().optional(),
  actualCompletionDate: z.string().nullable().optional(),
  contractValue: z.number().optional(),
  contractType: z.string().optional(),
  retainagePercent: z.number().optional(),
  targetBudgetPercent: z.number().optional(),
  taxRate: z.number().optional(),
  paymentTerms: z.string().optional(),
  setInactiveDate: z.string().nullable().optional(),
  tcoDate: z.string().min(1, 'TCO date is required'),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
