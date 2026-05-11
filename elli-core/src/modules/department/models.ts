import z from 'zod';

export const DepartmentCreateSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
});

export type DepartmentCreateRequest = z.infer<typeof DepartmentCreateSchema>;

export const DepartmentUpdateSchema = DepartmentCreateSchema.extend({ id: z.ulid() });

export type DepartmentUpdateRequest = z.infer<typeof DepartmentUpdateSchema>;

export const DepartmentAssignEmployeeSchema = z.object({
    departmentId: z.ulid(),
    employeeId: z.ulid(),
    roleId: z.ulid(),
});

export type DepartmentAssignEmployeeRequest = z.infer<typeof DepartmentAssignEmployeeSchema>;

export const DepartmentRemoveEmployeeSchema = z.object({
    departmentId: z.ulid(),
    employeeId: z.ulid(),
});

export type DepartmentRemoveEmployeeRequest = z.infer<typeof DepartmentRemoveEmployeeSchema>;
