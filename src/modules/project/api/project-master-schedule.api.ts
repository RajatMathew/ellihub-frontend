import api from '@/app/api';
import {
  projectMasterScheduleSchema,
  type ProjectMasterSchedule,
  type SetProjectMasterScheduleInput,
} from '@/modules/project/schemas/project-master-schedule.schema';

const BASE = '/project';

function parseMasterSchedule(raw: unknown): ProjectMasterSchedule | null {
  if (raw == null) return null;
  return projectMasterScheduleSchema.parse(raw);
}

export const projectMasterScheduleApi = {
  async get(projectId: string): Promise<ProjectMasterSchedule | null> {
    const res = await api.get(`${BASE}/${projectId}/master-schedule`);
    return parseMasterSchedule(res.data?.data ?? res.data);
  },

  async set(
    projectId: string,
    data: SetProjectMasterScheduleInput
  ): Promise<ProjectMasterSchedule> {
    const res = await api.patch(`${BASE}/${projectId}/master-schedule`, data);
    return projectMasterScheduleSchema.parse(res.data?.data ?? res.data);
  },

  async remove(projectId: string): Promise<void> {
    await api.delete(`${BASE}/${projectId}/master-schedule`);
  },
};