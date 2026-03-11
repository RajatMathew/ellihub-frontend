import api from '@app/api';

import {
  projectStatusSchema,
  type CreateProjectStatusInput,
  type ProjectStatus,
  type UpdateProjectStatusInput,
} from '@modules/project/schemas/project-status.schema';

const BASE = '/projects/statuses';

export const projectStatusApi = {
  async list(): Promise<ProjectStatus[]> {
    const res = await api.get(BASE);
    const raw = res.data?.data ?? res.data ?? [];
    return (raw as unknown[]).map((item) => projectStatusSchema.parse(item));
  },

  async create(data: CreateProjectStatusInput): Promise<ProjectStatus> {
    const res = await api.post(BASE, data);
    return projectStatusSchema.parse(res.data?.data ?? res.data);
  },

  async update(id: string, data: UpdateProjectStatusInput): Promise<ProjectStatus> {
    const res = await api.put(`${BASE}/${id}`, data);
    return projectStatusSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
