import api from '@/app/api';
import {
  departmentDetailSchema,
  departmentPaginatedResponseSchema,
  departmentStatsSchema,
  type AssignEmployeeInput,
  type CreateDepartmentInput,
  type DepartmentDetail,
  type DepartmentPaginatedResponse,
  type DepartmentStats,
  type ListDepartmentsParams,
  type RemoveEmployeeInput,
  type UpdateDepartmentInput,
} from '@/modules/hr/schemas/department.schema';

const BASE = '/hr/department';

export const departmentsApi = {
  async list(params?: ListDepartmentsParams): Promise<DepartmentPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;

    const res = await api.get(BASE, { params: query });
    const pagination = res.data?.pagination ?? {};
    const raw = {
      data: res.data?.data ?? res.data ?? [],
      pagination: {
        currentPage: params?.page ?? 1,
        totalPages: pagination.totalPages ?? 1,
        hasNextPage: pagination.hasNextPage ?? false,
        hasPreviousPage: pagination.hasPreviousPage ?? false,
        totalItems:
          pagination.totalItems ?? (Array.isArray(res.data?.data) ? res.data.data.length : 0),
        itemsPerPage: pagination.itemsPerPage ?? pagination.pageSize ?? params?.size ?? 25,
      },
    };
    return departmentPaginatedResponseSchema.parse(raw);
  },

  async stats(): Promise<DepartmentStats> {
    const res = await api.get(`${BASE}/stats`);
    return departmentStatsSchema.parse(res.data?.data ?? res.data);
  },

  async getById(id: string): Promise<DepartmentDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    return departmentDetailSchema.parse(raw);
  },

  async create(data: CreateDepartmentInput): Promise<DepartmentDetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    return departmentDetailSchema.parse(raw);
  },

  async update(data: UpdateDepartmentInput): Promise<DepartmentDetail> {
    const res = await api.put(BASE, data);
    const raw = res.data?.data ?? res.data;
    return departmentDetailSchema.parse(raw);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async assignEmployee(data: AssignEmployeeInput): Promise<void> {
    await api.patch(`${BASE}/employee/assign`, data);
  },

  async removeEmployee(data: RemoveEmployeeInput): Promise<void> {
    await api.patch(`${BASE}/employee/remove`, data);
  },
};
