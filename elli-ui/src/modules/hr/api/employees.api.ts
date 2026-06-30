import api from '@/app/api';
import {
  employeePaginatedResponseSchema,
  employeeProjectSchema,
  employeeSchema,
  employeeStatsSchema,
  type CreateEmployeeInput,
  type Employee,
  type EmployeePaginatedResponse,
  type EmployeeProject,
  type EmployeeStats,
  type LinkEmployeeUserInput,
  type ListEmployeesParams,
  type UpdateEmployeeInput,
} from '@/modules/hr/schemas/employee.schema';
import { z } from 'zod';

const BASE = '/hr/employee';

function toCreatePayload(input: CreateEmployeeInput) {
  return {
    name: input.name,
    email: input.email,
    phoneNumber: input.phoneNumber,
    address: input.address,
    startDate: input.startDate,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    emergencyContactRelation: input.emergencyContactRelation,
    roleId: input.roleId,
    createAccount: input.createAccount,
    ...(input.createAccount
      ? {
          authRole: input.authRole,
          password: input.password,
        }
      : {}),
  };
}

function toUpdatePayload(input: UpdateEmployeeInput) {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    phoneNumber: input.phoneNumber,
    address: input.address,
    startDate: input.startDate,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    emergencyContactRelation: input.emergencyContactRelation,
    roleId: input.roleId,
  };
}

export const employeesApi = {
  async list(params: ListEmployeesParams): Promise<EmployeePaginatedResponse> {
    const res = await api.get(BASE, { params });
    const rows = res.data?.data ?? res.data ?? [];
    const pagination = res.data?.pagination ?? {};

    return employeePaginatedResponseSchema.parse({
      data: rows,
      pagination: {
        totalItems: pagination.totalItems ?? rows.length,
        totalPages: pagination.totalPages ?? 1,
        currentPage: pagination.currentPage ?? params.page ?? 1,
        pageSize: pagination.pageSize ?? pagination.itemsPerPage ?? params.size ?? 25,
      },
    });
  },

  async stats(): Promise<EmployeeStats> {
    const res = await api.get(`${BASE}/stats`);
    return employeeStatsSchema.parse(res.data?.data ?? res.data);
  },

  async getById(id: string): Promise<Employee> {
    const res = await api.get(`${BASE}/${id}`);
    return employeeSchema.parse(res.data?.data ?? res.data);
  },

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const res = await api.post(BASE, toCreatePayload(input));
    return employeeSchema.parse(res.data?.data ?? res.data);
  },

  async update(input: UpdateEmployeeInput): Promise<Employee> {
    const res = await api.put(BASE, toUpdatePayload(input));
    return employeeSchema.parse(res.data?.data ?? res.data);
  },

  async linkUser(employeeId: string, input: LinkEmployeeUserInput): Promise<Employee> {
    const res = await api.post(`${BASE}/${employeeId}/user`, input);
    return employeeSchema.parse(res.data?.data ?? res.data);
  },

  async unlinkUser(employeeId: string): Promise<Employee> {
    const res = await api.delete(`${BASE}/${employeeId}/user`);
    return employeeSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async getProjects(id: string): Promise<EmployeeProject[]> {
    const res = await api.get(`${BASE}/${id}/projects`);
    return z.array(employeeProjectSchema).parse(res.data?.data ?? res.data ?? []);
  },

  async addDocument(employeeId: string, fileId: string, expiresOn?: string): Promise<void> {
    await api.patch(`${BASE}/document/add`, { employeeId, fileId, expiresOn });
  },

  async removeDocument(employeeId: string, fileId: string): Promise<void> {
    await api.patch(`${BASE}/document/remove`, { employeeId, fileId });
  },
};
