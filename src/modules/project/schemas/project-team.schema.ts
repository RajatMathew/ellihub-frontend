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

export const projectTeamResponseSchema = z.object({
  leadPM: projectTeamAssignmentSchema.nullable(),
  teamMembers: z.array(projectTeamAssignmentSchema),
});

export type ProjectTeamResponse = z.infer<typeof projectTeamResponseSchema>;

export const addTeamMemberInputSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  role: z.string().max(100).optional(),
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberInputSchema>;
