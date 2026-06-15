import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const DepartmentCreateSchema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
});

export type DepartmentCreateRequest = z.infer<typeof DepartmentCreateSchema>;

export const DepartmentUpdateSchema = DepartmentCreateSchema.extend({ id: nanoIdSchema });

export type DepartmentUpdateRequest = z.infer<typeof DepartmentUpdateSchema>;

export const DepartmentAssignEmployeeSchema = z.object({
    departmentId: nanoIdSchema,
    employeeId: nanoIdSchema,
});

export type DepartmentAssignEmployeeRequest = z.infer<typeof DepartmentAssignEmployeeSchema>;

export const DepartmentRemoveEmployeeSchema = z.object({
    departmentId: nanoIdSchema,
    employeeId: nanoIdSchema,
});

export type DepartmentRemoveEmployeeRequest = z.infer<typeof DepartmentRemoveEmployeeSchema>;
