import api from '@app/api';

import {
  projectScheduleEntrySchema,
  schedulePaginatedResponseSchema,
  type CreateScheduleEntryInput,
  type ListScheduleParams,
  type ProjectScheduleEntry,
  type SchedulePaginatedResponse,
  type UpdateScheduleEntryInput,
} from '@modules/project/schemas/project-schedule.schema';

const BASE = '/projects';

export const projectScheduleApi = {
  async list(
    projectId: string,
    params?: ListScheduleParams,
  ): Promise<SchedulePaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;

    const res = await api.get(`${BASE}/${projectId}/schedule`, { params: query });
    const raw = {
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: params?.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params?.size ?? 50,
      },
    };
    const result = schedulePaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectScheduleApi.list] Zod parse error:', result.error.issues);
      console.error('[projectScheduleApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async create(
    projectId: string,
    data: CreateScheduleEntryInput,
  ): Promise<ProjectScheduleEntry> {
    const res = await api.post(`${BASE}/${projectId}/schedule`, data);
    return projectScheduleEntrySchema.parse(res.data?.data ?? res.data);
  },

  async update(
    projectId: string,
    entryId: string,
    data: UpdateScheduleEntryInput,
  ): Promise<ProjectScheduleEntry> {
    const res = await api.put(`${BASE}/${projectId}/schedule/${entryId}`, data);
    return projectScheduleEntrySchema.parse(res.data?.data ?? res.data);
  },

  async remove(projectId: string, entryId: string): Promise<void> {
    await api.delete(`${BASE}/${projectId}/schedule/${entryId}`);
  },
};
