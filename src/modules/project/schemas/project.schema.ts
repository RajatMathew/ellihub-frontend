import { z } from 'zod';

import { projectStageSchema } from './project-stage.schema';
import { primeContractSchema } from './project-contract.schema';
import { projectStatusSchema } from './project-status.schema';
import { projectScheduleEntrySchema } from './project-schedule.schema';
import { projectTeamAssignmentSchema } from './project-team.schema';

export const divisionSchema = z.enum(['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL']);

export type Division = z.infer<typeof divisionSchema>;

export const projectListItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    jobNumber: z.string().nullable().optional(),
    contractNumber: z.string().nullable().optional(),
    division: divisionSchema,
    stageId: z.string(),
    stage: projectStageSchema.nullable().optional(),
    description: z.string(),
    status: projectStatusSchema.nullable().optional(),
    streetAddress: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    effectiveStartDate: z.string().nullable().optional(),
    effectiveEndDate: z.string().nullable().optional(),
    gc: z
      .object({ id: z.string(), name: z.string() })
      .passthrough()
      .nullable()
      .optional(),
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
  })
  .passthrough();

export type ProjectListItem = z.infer<typeof projectListItemSchema>;

export const projectDetailSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    jobNumber: z.string().nullable().optional(),
    contractNumber: z.string().nullable().optional(),
    division: divisionSchema,
    description: z.string(),
    stageId: z.string(),
    statusId: z.string().nullable().optional(),
    gcId: z.string(),
    leadPMId: z.string().nullable().optional(),
    streetAddress: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    zipCode: z.string().nullable().optional(),
    effectiveStartDate: z.string().nullable().optional(),
    effectiveEndDate: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    stage: projectStageSchema.nullable().optional(),
    status: projectStatusSchema.nullable().optional(),
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
  })
  .passthrough();

export type ProjectDetail = z.infer<typeof projectDetailSchema>;

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

export const createProjectInputSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().min(1, 'Description is required'),
  jobNumber: z.string().optional(),
  contractNumber: z.string().max(100).optional(),
  stageId: z.string().min(1, 'Stage is required'),
  division: divisionSchema,
  statusId: z.string().optional(),
  gcId: z.string().min(1, 'GC is required'),
  leadPMId: z.string().optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().optional(),
  contract: z
    .object({ contractValue: z.number().positive() })
    .optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const listProjectsParamsSchema = z.object({
  search: z.string().optional(),
  statusId: z.string().optional(),
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
  jobNumber: z.string(),
  stageId: z.string().min(1, 'Project status is required'),
  division: divisionSchema,
  gcId: z.string().min(1, 'General contractor is required'),
  leadPMId: z.string(),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  effectiveStartDate: z.string(),
  effectiveEndDate: z.string(),
  contractValue: z.number().min(0),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/* ---- Update schema (all fields optional, partial update) ---- */

export const updateProjectInputSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  contractNumber: z.string().max(100).optional(),
  stageId: z.string().min(1).optional(),
  division: divisionSchema.optional(),
  statusId: z.string().min(1).optional(),
  gcId: z.string().min(1).optional(),
  leadPMId: z.string().min(1).optional(),
  streetAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
