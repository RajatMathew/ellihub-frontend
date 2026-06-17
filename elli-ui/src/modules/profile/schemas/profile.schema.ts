import { z } from 'zod';

const nullableString = z.string().optional().nullable();

export const profileUserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    emailVerified: z.boolean().optional(),
    image: nullableString,
    role: nullableString,
    profile: nullableString,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const profileDepartmentSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: nullableString,
  })
  .passthrough();

export const profileRoleSchema = z
  .object({
    id: z.string(),
    label: nullableString,
    name: nullableString,
    type: nullableString,
  })
  .passthrough();

export const profileEmployeeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    phoneNumber: nullableString,
    address: nullableString,
    startDate: nullableString,
    emergencyContactName: nullableString,
    emergencyContactPhone: nullableString,
    emergencyContactRelation: nullableString,
    departmentId: nullableString,
    roleId: nullableString,
    department: profileDepartmentSchema.optional().nullable(),
    role: profileRoleSchema.optional().nullable(),
    status: nullableString,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export const profileSignatureSchema = z.object({
  name: z.string(),
  role: z.string(),
  email: z.string().email(),
});

export const userProfileSchema = z.object({
  user: profileUserSchema,
  employee: profileEmployeeSchema.optional().nullable(),
  signature: profileSignatureSchema,
  missingFields: z.array(z.string()).default([]),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const updateProfileInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
  image: z.string().trim().optional(),
  phoneNumber: z.string().trim().min(7, 'Phone number is required'),
  address: z.string().trim().optional(),
  startDate: z.string().optional(),
  emergencyContactName: z.string().trim().optional(),
  emergencyContactPhone: z.string().trim().optional(),
  emergencyContactRelation: z.string().trim().optional(),
  signatureName: z.string().trim().min(1, 'Signature name is required'),
  signatureRole: z.string().trim().min(1, 'Signature role is required'),
  signatureEmail: z.string().trim().email('Invalid signature email address'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;
