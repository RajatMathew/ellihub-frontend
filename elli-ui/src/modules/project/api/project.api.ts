import api from '@/app/api';
import { costCodeSchema, type CostCode } from '@/modules/catalog/schemas/costcode.schema';
import { employeeSchema, type Employee } from '@/modules/hr/schemas/employee.schema';
import { invoiceApi } from '@/modules/project/api/invoice';
import {
  fieldwireProjectOptionSchema,
  projectDetailSchema,
  projectPaginatedResponseSchema,
  projectStatsSchema,
  type CreateProjectInput,
  type FieldwireProjectOption,
  type ListProjectsParams,
  type ProjectDetail,
  type ProjectPaginatedResponse,
  type ProjectStats,
  type UpdateProjectInput,
} from '@/modules/project/schemas/project.schema';

const BASE = '/project';

const buildListQuery = (params?: ListProjectsParams) => {
  const query: Record<string, string | number> = {};
  const status = params?.status ?? params?.statusId;

  if (params?.page != null) query.page = params.page;
  if (params?.size != null) query.size = params.size;
  if (params?.sortBy) query.sortBy = params.sortBy;
  if (params?.sortOrder) query.sortOrder = params.sortOrder;
  if (params?.search) query.search = params.search;
  if (status) query.status = status;
  if (params?.division) query.division = params.division;
  if (params?.stageId) query.stageId = params.stageId;
  if (params?.gcId) query.gcId = params.gcId;
  if (params?.leadPMId) query.leadPMId = params.leadPMId;
  if (params?.year != null) query.year = params.year;

  return query;
};

export const projectApi = {
  async list(params?: ListProjectsParams): Promise<ProjectPaginatedResponse> {
    const query = buildListQuery(params);
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
    const result = projectPaginatedResponseSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectApi.list] Zod parse error:', result.error.issues);
      console.error('[projectApi.list] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async stats(params?: ListProjectsParams): Promise<ProjectStats> {
    const query = buildListQuery(params);
    const res = await api.get(`${BASE}/stats`, { params: query });
    const raw = res.data?.data ?? res.data;
    const result = projectStatsSchema.safeParse(raw);

    if (!result.success) {
      console.error('[projectApi.stats] Zod parse error:', result.error.issues);
      console.error('[projectApi.stats] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }

    return result.data;
  },

  async listAssigned(
    employeeId: string,
    params?: ListProjectsParams
  ): Promise<ProjectPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;

    const res = await api.get(`${BASE}/assigned/${employeeId}`, { params: query });
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
    return projectPaginatedResponseSchema.parse(raw);
  },

  async getById(id: string): Promise<ProjectDetail> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    return projectDetailSchema.parse(raw);
  },

  async listFieldwireProjects(): Promise<FieldwireProjectOption[]> {
    const res = await api.get(`${BASE}/fieldwire/projects`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = fieldwireProjectOptionSchema.array().safeParse(raw);

    if (!result.success) {
      console.error('[projectApi.listFieldwireProjects] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },

  async listProjectCostCodes(projectId: string): Promise<CostCode[]> {
    const res = await api.get(`${BASE}/${projectId}/cost-codes`);
    return costCodeSchema.array().parse(res.data?.data ?? res.data ?? []);
  },

  async listProjectEmployeeOptions(projectId: string): Promise<Employee[]> {
    const res = await api.get(`${BASE}/${projectId}/employee-options`);
    return employeeSchema.array().parse(res.data?.data ?? res.data ?? []);
  },

  async create(data: CreateProjectInput): Promise<ProjectDetail> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    return projectDetailSchema.parse(raw);
  },

  async update(id: string, data: UpdateProjectInput): Promise<ProjectDetail> {
    // Synchronizing with Swagger: PUT /project with ID in body
    const payload = { ...data, id };
    const res = await api.put(BASE, payload);
    const raw = res.data?.data ?? res.data;
    return projectDetailSchema.parse(raw);
  },

  async setActive(id: string): Promise<void> {
    await api.patch(`${BASE}/${id}/set-active`);
  },

  async setInactive(id: string): Promise<void> {
    await api.patch(`${BASE}/${id}/set-inactive`);
  },

  async setClosed(id: string): Promise<void> {
    await api.patch(`${BASE}/${id}/set-closed`);
  },

  async setCompleted(id: string): Promise<void> {
    await api.patch(`${BASE}/${id}/set-completed`);
  },

  async getInvoiceAging(
    id: string,
    params?: { asOfDate?: string; vendorId?: string }
  ): Promise<unknown> {
    const query: Record<string, string> = {};
    if (params?.asOfDate) query.asOfDate = params.asOfDate;
    if (params?.vendorId) query.vendorId = params.vendorId;
    const res = await api.get(`/project/${id}/invoice-aging`, { params: query });
    return res.data?.data ?? res.data;
  },

  async getInvoiceSummary(id: string): Promise<unknown> {
    return invoiceApi.summary(id);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
