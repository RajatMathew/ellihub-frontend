import { z } from 'zod';

export const teamEmployeeSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
  })
  .passthrough();

export type TeamEmployee = z.infer<typeof teamEmployeeSchema>;

export const projectTeamAssignmentSchema = z
  .object({
    projectId: z.string(),
    employeeId: z.string(),
    role: z.string().nullable().optional(),
    deletedAt: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    employee: teamEmployeeSchema.optional(),
  })
  .passthrough();

export type ProjectTeamAssignment = z.infer<typeof projectTeamAssignmentSchema>;
