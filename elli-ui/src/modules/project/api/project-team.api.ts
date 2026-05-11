import api from '@/app/api';

import {
  projectTeamAssignmentSchema,
  type ProjectTeamAssignment,
} from '@/modules/project/schemas/project-team.schema';

const BASE = '/project';

export const projectTeamApi = {
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
    const params = keepOldPM != null ? { keepOldPM } : undefined;
    await api.put(`${BASE}/${projectId}/team/${employeeId}/promote`, null, { params });
  },
};
