import api from '@app/api';

import {
  projectStageSchema,
  type CreateProjectStageInput,
  type ProjectStage,
  type UpdateProjectStageInput,
} from '@modules/project/schemas/project-stage.schema';

const BASE = '/lookup';

export const projectStageApi = {
  async list(): Promise<ProjectStage[]> {
    const res = await api.get(`${BASE}/type/PROJECT_STAGE`);
    const raw = res.data?.data ?? res.data ?? [];
    return (raw as unknown[]).map((item) => projectStageSchema.parse(item));
  },

  async create(data: CreateProjectStageInput): Promise<ProjectStage> {
    const res = await api.post(BASE, { ...data, type: 'PROJECT_STAGE' });
    return projectStageSchema.parse(res.data?.data ?? res.data);
  },

  async update(id: string, data: UpdateProjectStageInput): Promise<ProjectStage> {
    const res = await api.put(BASE, { ...data, id });
    return projectStageSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
