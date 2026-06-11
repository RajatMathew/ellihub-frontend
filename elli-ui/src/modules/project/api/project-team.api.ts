import api from '@/app/api';

import {
  projectTeamAssignmentSchema,
  type ProjectTeamRole,
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

  async promoteToLeadPM(projectId: string, employeeId: string): Promise<ProjectTeamAssignment> {
    const res = await api.put(`${BASE}/${projectId}/team/${employeeId}/promote`);
    return projectTeamAssignmentSchema.parse(res.data?.data ?? res.data);
  },

  async updateMemberRole(
    projectId: string,
    employeeId: string,
    role: ProjectTeamRole
  ): Promise<ProjectTeamAssignment> {
    const res = await api.patch(`${BASE}/${projectId}/team/${employeeId}/role`, { role });
    return projectTeamAssignmentSchema.parse(res.data?.data ?? res.data);
  },
};
