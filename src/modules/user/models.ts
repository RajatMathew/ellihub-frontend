import { statement } from '@lib/permissions';
import { MailSignatureSchema } from '@modules/mail/models';
import z from 'zod';

export const AppRoleSchema = z.enum(['dev', 'admin', 'accountant', 'pm', 'user']);
export type AppRole = z.infer<typeof AppRoleSchema>;

export const UserCreateSchema = z.object({
    email: z.email('Please enter a valid email'),
    name: z.string().min(1, 'Name is required'),
    role: AppRoleSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type UserCreateRequest = z.infer<typeof UserCreateSchema>;

export const UserUpdateSchema = UserCreateSchema.omit({ password: true }).extend({
    id: z.string().min(8),
});

export type UserUpdateRequest = z.infer<typeof UserUpdateSchema>;

export const UserRoleUpdateSchema = z.object({
    role: AppRoleSchema,
});

export type UserRoleUpdateRequest = z.infer<typeof UserRoleUpdateSchema>;

export const UserPasswordResetSchema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
    revokeSessions: z.boolean().default(true),
});

export type UserPasswordResetRequest = z.infer<typeof UserPasswordResetSchema>;

export const UserSuspendSchema = z.object({
    banReason: z.string().trim().max(500).optional(),
    banExpiresIn: z.number().int().positive().optional(),
});

export type UserSuspendRequest = z.infer<typeof UserSuspendSchema>;

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

const permissionSchema = z
    .object({
        user: z.array(z.enum(statement.user)),
        role: z.array(z.enum(statement.role)),
        project: z.array(z.enum(statement.project)),
        projectTeam: z.array(z.enum(statement.projectTeam)),
        employee: z.array(z.enum(statement.employee)),
        leave: z.array(z.enum(statement.leave)),
        file: z.array(z.enum(statement.file)),
        lookup: z.array(z.enum(statement.lookup)),
        revision: z.array(z.enum(statement.revision)),
        costCodeGroup: z.array(z.enum(statement.costCodeGroup)),
        costCode: z.array(z.enum(statement.costCode)),
        contact: z.array(z.enum(statement.contact)),
        professionalRole: z.array(z.enum(statement.professionalRole)),
        generalContractor: z.array(z.enum(statement.generalContractor)),
        gcType: z.array(z.enum(statement.gcType)),
        vendor: z.array(z.enum(statement.vendor)),
        department: z.array(z.enum(statement.department)),
        activityLog: z.array(z.enum(statement.activityLog)),
        rfq: z.array(z.enum(statement.rfq)),
        purchaseOrder: z.array(z.enum(statement.purchaseOrder)),
        primeChangeOrder: z.array(z.enum(statement.primeChangeOrder)),
        subChangeOrder: z.array(z.enum(statement.subChangeOrder)),
        invoice: z.array(z.enum(statement.invoice)),
        mail: z.array(z.enum(statement.mail)),
    })
    .partial();

export type PermissionStatement = z.infer<typeof permissionSchema>;

export const roleCreateSchema = z.object({
    role: z.string().min(3),
    permission: permissionSchema,
});

export type RoleCreateRequest = z.infer<typeof roleCreateSchema>;
