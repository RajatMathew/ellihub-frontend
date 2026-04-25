import { z } from 'zod';

export const ptoStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type PTOStatus = z.infer<typeof ptoStatusEnum>;

export const ptoSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
    department: z.object({
      id: z.string(),
      name: z.string(),
    }).optional().nullable(),
    role: z.object({
      id: z.string(),
      label: z.string(),
    }).optional().nullable(),
  }).optional().nullable(),
  typeId: z.string(),
  type: z.object({
    id: z.string(),
    label: z.string(),
  }).optional().nullable(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional().nullable(),
  status: ptoStatusEnum,
  reviewNote: z.string().optional().nullable(),
  reviewedAt: z.string().optional().nullable(),
  reviewedById: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PTO = z.infer<typeof ptoSchema>;

export const createPTOInputSchema = z.object({
  employeeId: z.string(),
  typeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

export type CreatePTOInput = z.infer<typeof createPTOInputSchema>;

export const updatePTOInputSchema = z.object({
  id: z.string(),
  typeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().optional(),
});

export type UpdatePTOInput = z.infer<typeof updatePTOInputSchema>;

export const ptoDecisionInputSchema = z.object({
  id: z.string(),
  note: z.string().optional(),
});

export type PTODecisionInput = z.infer<typeof ptoDecisionInputSchema>;

export const ptoPaginatedResponseSchema = z.object({
  data: z.array(ptoSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalItems: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type PTOPaginatedResponse = z.infer<typeof ptoPaginatedResponseSchema>;
