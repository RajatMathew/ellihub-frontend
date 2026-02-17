import { statement } from '@lib/permissions';
import z from 'zod';

export const UserCreateSchema = z.object({
    email: z.email('Please enter a valid email'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'user']),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type UserCreateRequest = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = UserCreateSchema.extend({
    id: z.string().min(8),
});

export type UserUpdateRequest = z.infer<typeof UserUpdateSchema>;

const permissionSchema = z.object({
    user: z.array(z.enum(statement.user)),
    project: z.array(z.enum(statement.project)),
    leave: z.array(z.enum(statement.leave)),
    costCodeGroup: z.array(z.enum(statement.costCodeGroup)),
    costCode: z.array(z.enum(statement.costCode)),
});

export type PermissionStatement = z.infer<typeof permissionSchema>;

export const roleCreateSchema = z.object({
    role: z.string().min(3),
    permission: permissionSchema,
});

export type RoleCreateRequest = z.infer<typeof roleCreateSchema>;
