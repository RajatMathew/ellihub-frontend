import { fileSchema } from '@/modules/files/schemas/file.schema';
import { z } from 'zod';

export const employeeRoleSchema = z
  .object({
    id: z.string(),
    name: z.string().optional().nullable(),
    label: z.string().optional().nullable(),
    type: z.string().optional().nullable(),
  })
  .passthrough();

export const employeeDepartmentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional().nullable(),
  })
  .passthrough();

export const employeeAuthRoleSchema = z.enum(['dev', 'admin', 'accountant', 'pm', 'user']);
export type EmployeeAuthRole = z.infer<typeof employeeAuthRoleSchema>;

export const employeeAuthUserSchema = z
  .object({
    id: z.string(),
    role: z.string().optional().nullable(),
  })
  .passthrough();

export const employeeDocumentSchema = z
  .object({
    id: z.string(),
    employeeId: z.string(),
    fileId: z.string(),
    expiresOn: z.string().optional().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    file: fileSchema.optional().nullable(),
  })
  .passthrough();

// Base employee schema matching the API response
export const employeeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phoneNumber: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    emergencyContactName: z.string().optional().nullable(),
    emergencyContactPhone: z.string().optional().nullable(),
    emergencyContactRelation: z.string().optional().nullable(),
    userId: z.string().optional().nullable(),
    authRole: z.enum(['dev', 'admin', 'accountant', 'pm', 'user', 'unlinked']).optional(),
    authUser: employeeAuthUserSchema.optional().nullable(),
    departmentId: z.string().optional().nullable(),
    roleId: z.string().optional().nullable(),
    role: employeeRoleSchema.optional().nullable(),
    department: employeeDepartmentSchema.optional().nullable(),
    status: z.string().optional().nullable(),
    documents: z.array(employeeDocumentSchema).optional().default([]),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type Employee = z.infer<typeof employeeSchema>;
export type EmployeeDocument = z.infer<typeof employeeDocumentSchema>;

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

export const employeeStatsSchema = z.object({
  totalEmployees: z.number(),
  activeEmployees: z.number(),
  onLeaveEmployees: z.number(),
  linkedUsers: z.number(),
  unlinkedEmployees: z.number(),
  assignedToDepartment: z.number(),
  withoutDepartment: z.number(),
});

export type EmployeeStats = z.infer<typeof employeeStatsSchema>;

// Input schema for creation
const createEmployeeBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  startDate: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  roleId: z
    .string({ required_error: 'Professional role is required' })
    .min(1, 'Professional role is required')
    .transform((value) => (value === '' ? undefined : value)),
  createAccount: z.boolean().default(false),
  authRole: employeeAuthRoleSchema.optional(),
  password: z.string().optional(),
});

export const createEmployeeInputSchema = createEmployeeBaseSchema.superRefine((value, ctx) => {
  if (!value.createAccount) return;

  if (!value.authRole) {
    ctx.addIssue({
      code: 'custom',
      path: ['authRole'],
      message: 'Auth role is required',
    });
  }

  if (!value.password || value.password.length < 8) {
    ctx.addIssue({
      code: 'custom',
      path: ['password'],
      message: 'Password must be at least 8 characters',
    });
  }
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;

export const updateEmployeeInputSchema = createEmployeeBaseSchema
  .omit({ createAccount: true, authRole: true, password: true })
  .extend({
    id: z.string(),
  });

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;

export const linkEmployeeUserInputSchema = z.object({
  role: employeeAuthRoleSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LinkEmployeeUserInput = z.infer<typeof linkEmployeeUserInputSchema>;

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
  jobNumber: z.string().optional().nullable(),
  status: z.string(),
  role: z.string().optional().nullable(),
  isLead: z.boolean().optional().default(false),
  estimatedStartDate: z.string().optional().nullable(),
  estimatedEndDate: z.string().optional().nullable(),
  tcoDate: z.string().optional().nullable(),
  gcName: z.string().optional().nullable(),
});

export type EmployeeProject = z.infer<typeof employeeProjectSchema>;
