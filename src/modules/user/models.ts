import { statement } from '@lib/permissions';
import { MailSignatureSchema } from '@modules/mail/models';
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

const nullableTrimmedString = (maxLength = 255) =>
    z
        .string()
        .trim()
        .max(maxLength)
        .optional()
        .nullable()
        .transform((value) => (value === '' ? null : value));

const nullableProfilePhone = nullableTrimmedString(40).refine(
    (value) => !value || value.length >= 7,
    'Phone number must be at least 7 characters'
);

export const UserProfileUpdateSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(120).optional(),
    email: z.email('Please enter a valid email').optional(),
    image: nullableTrimmedString(500),
    phoneNumber: nullableProfilePhone,
    address: nullableTrimmedString(500),
    startDate: z.preprocess(
        (value) => (value === '' ? null : value),
        z.coerce.date().optional().nullable()
    ),
    emergencyContactName: nullableTrimmedString(120),
    emergencyContactPhone: nullableTrimmedString(40),
    emergencyContactRelation: nullableTrimmedString(80),
    signature: MailSignatureSchema.optional(),
});

export type UserProfileUpdateRequest = z.infer<typeof UserProfileUpdateSchema>;

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
