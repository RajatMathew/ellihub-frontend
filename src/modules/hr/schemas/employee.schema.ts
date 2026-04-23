import { z } from 'zod';

// Base employee schema matching the API response
export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phoneNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  role: z.object({
    id: z.string(),
    name: z.string(),
  }).optional().nullable(),
  department: z.object({
    id: z.string(),
    name: z.string(),
  }).optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Employee = z.infer<typeof employeeSchema>;

// Pagination schema
export const employeePaginatedResponseSchema = z.object({
  data: z.array(employeeSchema),
  pagination: z.object({
    totalItems: z.number(),
    totalPages: z.number(),
    currentPage: z.number(),
    pageSize: z.number(),
  }),
});

export type EmployeePaginatedResponse = z.infer<typeof employeePaginatedResponseSchema>;

// Input schema for creation
export const createEmployeeInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  roleId: z.string().optional(),
  createAccount: z.boolean().default(true),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

// Input schema for update
export const updateEmployeeInputSchema = createEmployeeInputSchema.omit({ createAccount: true, roleId: true }).extend({
  id: z.string(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

// Query params schema
export const listEmployeesParamsSchema = z.object({
  page: z.number().optional().default(1),
  size: z.number().optional().default(25),
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  search: z.string().optional(),
});

export type ListEmployeesParams = z.infer<typeof listEmployeesParamsSchema>;

// Employee Project schema
export const employeeProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  role: z.string().optional(),
  assignedAt: z.string().optional(),
});

export type EmployeeProject = z.infer<typeof employeeProjectSchema>;
