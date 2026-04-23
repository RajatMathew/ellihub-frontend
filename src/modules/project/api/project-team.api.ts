import api from '@app/api';

import {
  projectTeamAssignmentSchema,
  projectTeamResponseSchema,
  type ProjectTeamAssignment,
  type ProjectTeamResponse,
} from '@modules/project/schemas/project-team.schema';

const BASE = '/project';

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

  async addMember(data: {
    projectId: string;
    employeeId: string;
    role: string;
    isLead?: boolean;
  }): Promise<ProjectTeamAssignment> {
    const res = await api.patch(`${BASE}/team-member/add`, data);
    return projectTeamAssignmentSchema.parse(res.data?.data ?? res.data);
  },

  async removeMember(projectId: string, employeeId: string): Promise<void> {
    await api.patch(`${BASE}/team-member/remove`, { projectId, employeeId });
  },

  async promoteToLeadPM(
    projectId: string,
    employeeId: string,
    keepOldPM?: boolean,
  ): Promise<void> {
    // Note: The Swagger shows set-lead might be different now, 
    // but the promote endpoint was not in the provided curl list.
    // I'll update addMember with isLead toggle instead if needed.
    const params = keepOldPM != null ? { keepOldPM } : undefined;
    await api.put(`${BASE}/${projectId}/team/${employeeId}/promote`, null, { params });
  },
};
