import { z } from 'zod';

export const departmentRoleSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional().nullable(),
    label: z.string().optional().nullable(),
  })
  .passthrough();

export const departmentEmployeeProfileSchema = z
  .object({
    id: z.string(),
    name: z.string().optional().nullable(),
    fullName: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    role: departmentRoleSchema.optional().nullable(),
  })
  .passthrough();

export const departmentEmployeeSchema = z
  .object({
    id: z.string().optional(),
    employeeId: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    fullName: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    role: departmentRoleSchema.optional().nullable(),
    employee: departmentEmployeeProfileSchema.optional().nullable(),
  })
  .passthrough();

export type DepartmentEmployee = z.infer<typeof departmentEmployeeSchema>;

export const departmentSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
    employeeCount: z.number().optional().default(0),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    deletedAt: z.string().optional().nullable(),
  })
  .passthrough();

export type Department = z.infer<typeof departmentSchema>;

export const departmentDetailSchema = departmentSchema
  .extend({
    employees: z.array(departmentEmployeeSchema).optional().default([]),
  })
  .passthrough();

export type DepartmentDetail = z.infer<typeof departmentDetailSchema>;

export const departmentPaginatedResponseSchema = z.object({
  data: z.array(departmentSchema),
  pagination: z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
  }),
});

export type DepartmentPaginatedResponse = z.infer<typeof departmentPaginatedResponseSchema>;

export const departmentStatsSchema = z.object({
  totalDepartments: z.number(),
  assignedEmployees: z.number(),
  unassignedEmployees: z.number(),
  emptyDepartments: z.number(),
});

export type DepartmentStats = z.infer<typeof departmentStatsSchema>;

export const createDepartmentInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentInputSchema>;

export const updateDepartmentInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentInputSchema>;

export const assignEmployeeInputSchema = z.object({
  departmentId: z.string(),
  employeeId: z.string(),
});

export type AssignEmployeeInput = z.infer<typeof assignEmployeeInputSchema>;

export const removeEmployeeInputSchema = z.object({
  departmentId: z.string(),
  employeeId: z.string(),
});

export type RemoveEmployeeInput = z.infer<typeof removeEmployeeInputSchema>;

export const listDepartmentsParamsSchema = z.object({
  page: z.number().min(1).optional().default(1),
  size: z.number().min(1).optional().default(25),
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  search: z.string().optional(),
});

export type ListDepartmentsParams = z.infer<typeof listDepartmentsParamsSchema>;
