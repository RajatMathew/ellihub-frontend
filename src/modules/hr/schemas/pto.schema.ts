import { z } from 'zod';

export const ptoStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type PTOStatus = z.infer<typeof ptoStatusEnum>;

export const ptoSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employee: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().optional().nullable(),
      phoneNumber: z.string().optional().nullable(),
      department: z
        .object({
          id: z.string(),
          name: z.string(),
        })
        .optional()
        .nullable(),
      role: z
        .object({
          id: z.string(),
          label: z.string().optional().nullable(),
          name: z.string().optional().nullable(),
        })
        .passthrough()
        .optional()
        .nullable(),
    })
    .passthrough()
    .optional()
    .nullable(),
  typeId: z.string(),
  type: z
    .object({
      id: z.string(),
      label: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
    })
    .passthrough()
    .optional()
    .nullable(),
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
  employeeId: z.string().min(1, 'Employee is required'),
  typeId: z.string().min(1, 'PTO type is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().trim().min(1, 'Justification / Notes is required'),
});

export type CreatePTOInput = z.infer<typeof createPTOInputSchema>;

export const updatePTOInputSchema = z.object({
  id: z.string(),
  typeId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  reason: z.string().trim().min(1, 'Justification / Notes is required').optional(),
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

export const ptoStatsSchema = z.object({
  totalRequests: z.number(),
  pendingRequests: z.number(),
  approvedRequests: z.number(),
  rejectedRequests: z.number(),
  upcomingApprovedRequests: z.number(),
});

export type PTOStats = z.infer<typeof ptoStatsSchema>;

export const listPTOParamsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  size: z.number().min(1).optional().default(10),
  sortBy: z.string().optional().default('startDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

export type ListPTOParams = z.infer<typeof listPTOParamsSchema>;
