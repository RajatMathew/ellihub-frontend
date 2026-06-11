import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const EmployeeAuthRoleSchema = z.enum(['dev', 'admin', 'accountant', 'pm', 'user']);

const EmployeeCreateBaseSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    phoneNumber: z.string().min(7),
    address: z.string().optional(),
    startDate: z.coerce.date().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    roleId: nanoIdSchema.optional(),
    createAccount: z.boolean().default(false),
    authRole: EmployeeAuthRoleSchema.optional(),
    password: z.string().optional(),
});

export const EmployeeCreateSchema = EmployeeCreateBaseSchema.superRefine((value, ctx) => {
    if (!value.createAccount) return;

    if (!value.authRole) {
        ctx.addIssue({
            code: 'custom',
            path: ['authRole'],
            message: 'Auth role is required when linking a user account',
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

export type EmployeeCreateRequest = z.infer<typeof EmployeeCreateSchema>;

export const EmployeeUpdateSchema = EmployeeCreateBaseSchema.omit({
    createAccount: true,
    authRole: true,
    password: true,
}).extend({ id: nanoIdSchema });

export type EmployeeUpdateRequest = z.infer<typeof EmployeeUpdateSchema>;

export const EmployeeLinkUserSchema = z.object({
    role: EmployeeAuthRoleSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type EmployeeLinkUserRequest = z.infer<typeof EmployeeLinkUserSchema>;

export const AddEmployeeDocumentSchema = z.object({
    employeeId: nanoIdSchema,
    fileId: nanoIdSchema,
    expiresOn: z.iso.date().optional().nullable(),
});

export type AddEmployeeDocumentRequest = z.infer<typeof AddEmployeeDocumentSchema>;

export const RemoveEmployeeDocumentSchema = z.object({
    employeeId: nanoIdSchema,
    fileId: nanoIdSchema,
});

export type RemoveEmployeeDocumentRequest = z.infer<typeof RemoveEmployeeDocumentSchema>;
