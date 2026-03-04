import api from '@app/api';

import {
  projectTeamAssignmentSchema,
  projectTeamResponseSchema,
  type AddTeamMemberInput,
  type ProjectTeamAssignment,
  type ProjectTeamResponse,
} from '@modules/project/schemas/project-team.schema';

const BASE = '/projects';

export const projectTeamApi = {
  async list(projectId: string): Promise<ProjectTeamResponse> {
    const res = await api.get(`${BASE}/${projectId}/team`);
    const raw = res.data?.data ?? res.data;
    const result = projectTeamResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectTeamApi.list] Zod parse error:', result.error.issues);
      console.error('[projectTeamApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async addMember(projectId: string, data: AddTeamMemberInput): Promise<ProjectTeamAssignment> {
    const res = await api.post(`${BASE}/${projectId}/team`, data);
    return projectTeamAssignmentSchema.parse(res.data?.data ?? res.data);
  },

  async promoteToLeadPM(
    projectId: string,
    employeeId: string,
    keepOldPM?: boolean,
  ): Promise<void> {
    const params = keepOldPM != null ? { keepOldPM } : undefined;
    await api.put(`${BASE}/${projectId}/team/${employeeId}/promote`, null, { params });
  },

  async removeMember(projectId: string, employeeId: string): Promise<void> {
    await api.delete(`${BASE}/${projectId}/team/${employeeId}`);
  },
};
