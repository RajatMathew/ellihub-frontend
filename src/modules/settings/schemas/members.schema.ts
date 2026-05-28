import { z } from 'zod';

export const memberRoleSchema = z.enum(['dev', 'admin', 'accountant', 'pm', 'user']);
export const memberStatusSchema = z.enum(['active', 'suspended']);
export const memberEmailStatusSchema = z.enum(['verified', 'pending']);
export const membersSortBySchema = z.enum([
  'name',
  'email',
  'role',
  'emailVerified',
  'banned',
  'createdAt',
]);

export type MemberRole = z.infer<typeof memberRoleSchema>;
export type MemberStatus = z.infer<typeof memberStatusSchema>;
export type MemberEmailStatus = z.infer<typeof memberEmailStatusSchema>;
export type MembersSortBy = z.infer<typeof membersSortBySchema>;

const dateLikeSchema = z.union([z.string(), z.date()]).optional().nullable();

export const memberUserSchema = z
  .object({
    id: z.string(),
    name: z.string().default(''),
    email: z.string().email(),
    emailVerified: z.boolean().optional().default(false),
    image: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    banned: z.boolean().optional().nullable(),
    banReason: z.string().optional().nullable(),
    banExpires: dateLikeSchema,
    createdAt: dateLikeSchema,
    updatedAt: dateLikeSchema,
  })
  .passthrough();

export type MemberUser = z.infer<typeof memberUserSchema>;

export const membersListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  size: z.number().int().min(5).max(100).default(25),
  search: z.string().trim().optional(),
  sortBy: membersSortBySchema.default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  role: memberRoleSchema.optional(),
  status: memberStatusSchema.optional(),
  emailStatus: memberEmailStatusSchema.optional(),
});

export type MembersListParams = z.infer<typeof membersListParamsSchema>;

export const membersListResponseSchema = z.object({
  data: z.array(memberUserSchema),
  pagination: z.object({
    totalItems: z.number(),
    totalPages: z.number(),
    currentPage: z.number(),
    pageSize: z.number(),
  }),
});

export type MembersListResponse = z.infer<typeof membersListResponseSchema>;

export const memberCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: memberRoleSchema,
});

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;

export const memberUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  role: memberRoleSchema,
});

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;

export const memberPasswordResetSchema = z.object({
  id: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
  revokeSessions: z.boolean().default(true),
});

export type MemberPasswordResetInput = z.infer<typeof memberPasswordResetSchema>;

export const memberSuspendSchema = z.object({
  id: z.string().min(1),
  banReason: z.string().trim().max(500).optional(),
  banExpiresIn: z.number().int().positive().optional(),
});

export type MemberSuspendInput = z.infer<typeof memberSuspendSchema>;

export const memberFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'Name is required').max(120),
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().max(128).optional(),
    role: memberRoleSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.id && (!value.password || value.password.length < 8)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password must be at least 8 characters',
      });
    }
  });

export type MemberFormInput = z.infer<typeof memberFormSchema>;
