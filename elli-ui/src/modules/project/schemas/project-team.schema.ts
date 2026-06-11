import { z } from 'zod';

export const projectTeamRoleSchema = z.enum(['Lead PM', 'PM', 'Member']);
export type ProjectTeamRole = z.infer<typeof projectTeamRoleSchema>;

export const teamEmployeeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
    authRole: z.enum(['dev', 'admin', 'accountant', 'pm', 'user', 'unlinked']).optional(),
    authUser: z
      .object({
        id: z.string(),
        role: z.string().optional().nullable(),
      })
      .passthrough()
      .optional()
      .nullable(),
  })
  .passthrough();

export type TeamEmployee = z.infer<typeof teamEmployeeSchema>;

export const projectTeamAssignmentSchema = z
  .object({
    projectId: z.string(),
    employeeId: z.string(),
    role: projectTeamRoleSchema.nullable().optional(),
    isLead: z.boolean().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    employee: teamEmployeeSchema.optional(),
  })
  .passthrough();

export type ProjectTeamAssignment = z.infer<typeof projectTeamAssignmentSchema>;
