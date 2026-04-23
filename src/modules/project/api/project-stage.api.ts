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
    const res = await api.get(BASE);
    const raw = res.data?.data ?? res.data ?? [];
    
    const STAGE_COLORS: Record<string, string> = {
      SUBMITTALS: '#6366f1', // Indigo
      BUYOUT: '#8b5cf6', // Violet
      FABRICATION: '#ec4899', // Pink
      INSTALLATION: '#3b82f6', // Blue
      PUNCHLIST: '#f59e0b', // Amber
      CLOSEOUT: '#10b981', // Emerald
    };

    // Filter by type and map to ProjectStage schema
    return (raw as any[])
      .filter((item) => item.type === 'PROJECT_STAGE')
      .map((item) => {
        const name = item.name || item.label || '';
        const nameUpper = name.toUpperCase();
        
        let defaultColor = '#94a3b8'; // slate-400 fallback
        for (const [key, color] of Object.entries(STAGE_COLORS)) {
          if (nameUpper.includes(key)) {
            defaultColor = color;
            break;
          }
        }

        return projectStageSchema.parse({
          id: item.id,
          name: name,
          code: item.code || item.name || '',
          description: item.description,
          color: item.color || defaultColor,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
      });
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
