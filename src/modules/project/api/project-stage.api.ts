import { z } from 'zod';

import api from '@/app/api';
import {
  projectStageSchema,
  type ProjectStage,
} from '@/modules/project/schemas/project-stage.schema';

const BASE = '/lookup';

const PROJECT_STAGE_ORDER = [
  'ONBOARDING',
  'SUBMITTALS',
  'BUYOUT',
  'INSTALLATION',
  'FABRICATION',
  'PUNCHLIST',
  'CLOSEOUT',
];

const projectStageOrder = new Map(PROJECT_STAGE_ORDER.map((stage, index) => [stage, index]));

function normalizeProjectStageName(name: string) {
  return name.trim().toUpperCase().replace(/\s+/g, '_');
}

const lookupProjectStageSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string().optional(),
    label: z.string().optional(),
    code: z.string().optional(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const projectStageApi = {
  async list(): Promise<ProjectStage[]> {
    const res = await api.get(BASE);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(lookupProjectStageSchema).safeParse(raw);
    if (!result.success) throw result.error;

    return result.data
      .filter((item) => item.type === 'PROJECT_STAGE')
      .map((item) =>
        projectStageSchema.parse({
          id: item.id,
          name: item.name || item.label || '',
          code: item.code || item.name || '',
          description: item.description,
          color: item.color ?? '',
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }),
      )
      .sort((a, b) => {
        const aOrder = projectStageOrder.get(normalizeProjectStageName(a.name));
        const bOrder = projectStageOrder.get(normalizeProjectStageName(b.name));

        if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;

        return a.name.localeCompare(b.name);
      });
  },
};
