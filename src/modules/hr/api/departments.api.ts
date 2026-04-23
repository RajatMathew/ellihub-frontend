import api from '@app/api';
import {
  departmentDetailSchema,
  departmentPaginatedResponseSchema,
  type CreateDepartmentInput,
  type ListDepartmentsParams,
  type UpdateDepartmentInput,
  type DepartmentDetail,
  type DepartmentPaginatedResponse,
  type AssignEmployeeInput,
  type RemoveEmployeeInput,
} from '@modules/hr/schemas/department.schema';

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
    const raw = {
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: params?.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params?.size ?? 25,
      },
    };
    const result = departmentPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[departmentsApi.list] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async getById(id: string): Promise<DepartmentDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = departmentDetailSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[departmentsApi.getById] Partial Validation Failure:', result.error);
      return raw as DepartmentDetail;
    }
    return result.data;
  },

  async create(data: CreateDepartmentInput): Promise<DepartmentDetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = departmentDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[departmentsApi.create] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async update(data: UpdateDepartmentInput): Promise<DepartmentDetail> {
    const res = await api.put(BASE, data);
    const raw = res.data?.data ?? res.data;
    const result = departmentDetailSchema.safeParse(raw);
    if (!result.success) {
      console.error('[departmentsApi.update] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
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
