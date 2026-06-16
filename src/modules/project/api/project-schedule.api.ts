import api from '@/app/api';
import { isAxiosError } from 'axios';

import {
  projectScheduleEntrySchema,
  type CreateScheduleEntryInput,
  type ProjectScheduleEntry,
  type UpdateScheduleEntryInput,
} from '@/modules/project/schemas/project-schedule.schema';

const BASE = '/project';

export const projectScheduleApi = {
  async list(projectId: string): Promise<ProjectScheduleEntry[]> {
    try {
      const res = await api.get(`${BASE}/schedule/${projectId}`);
      const raw = res.data?.data ?? res.data ?? [];
      const result = projectScheduleEntrySchema.array().safeParse(raw);
      if (!result.success) throw result.error;
      return result.data;
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return [];
      }
      throw err;
    }
  },

  async create(data: CreateScheduleEntryInput): Promise<ProjectScheduleEntry> {
    const res = await api.patch(`${BASE}/schedule/add`, data);
    return projectScheduleEntrySchema.parse(res.data?.data ?? res.data);
  },

  async update(data: UpdateScheduleEntryInput): Promise<ProjectScheduleEntry> {
    const res = await api.patch(`${BASE}/schedule/update`, data);
    return projectScheduleEntrySchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.patch(`${BASE}/schedule/remove`, { id });
  },
};
