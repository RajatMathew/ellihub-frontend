import api from '@app/api';
import type { AxiosError } from 'axios';

import {
  projectScheduleEntrySchema,
  schedulePaginatedResponseSchema,
  type ListScheduleParams,
  type ProjectScheduleEntry,
  type SchedulePaginatedResponse,
} from '@modules/project/schemas/project-schedule.schema';

const BASE = '/project';

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

    try {
      const res = await api.get(`${BASE}/schedule/${projectId}`, { params: query });
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
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 404) {
        // GET endpoint may not exist yet — return empty result
        return {
          data: [],
          pagination: {
            currentPage: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
            totalItems: 0,
            itemsPerPage: params?.size ?? 50,
          },
        };
      }
      throw err;
    }
  },

  async create(data: {
    projectId: string;
    date: string;
    description: string;
    adjustedStartDate?: string;
    adjustedFinishDate?: string;
    notes?: string;
    fileId?: string;
  }): Promise<ProjectScheduleEntry> {
    const res = await api.patch(`${BASE}/schedule/add`, data);
    return projectScheduleEntrySchema.parse(res.data?.data ?? res.data);
  },

  async update(data: {
    id: string;
    date?: string;
    description?: string;
    adjustedStartDate?: string;
    adjustedFinishDate?: string;
    notes?: string;
    fileId?: string;
  }): Promise<ProjectScheduleEntry> {
    const res = await api.patch(`${BASE}/schedule/update`, data);
    return projectScheduleEntrySchema.parse(res.data?.data ?? res.data);
  },

  async remove(projectId: string, id: string): Promise<void> {
    await api.patch(`${BASE}/schedule/remove`, { projectId, id });
  },
};
