import api from '@app/api';
import type { 
  Employee, 
  EmployeePaginatedResponse, 
  ListEmployeesParams, 
  CreateEmployeeInput, 
  UpdateEmployeeInput,
  EmployeeProject
} from '../schemas/employee.schema';

const BASE = '/hr/employee';

export const employeesApi = {
  async list(params: ListEmployeesParams): Promise<EmployeePaginatedResponse> {
    const { data } = await api.get(BASE, { params });
    // The API might return { data: [...], pagination: {...} } or just the array
    return data;
  },

  async getById(id: string): Promise<Employee> {
    const res = await api.get(`${BASE}/${id}`);
    return res.data?.data ?? res.data;
  },

  async create(input: CreateEmployeeInput): Promise<Employee> {
    const res = await api.post(BASE, input);
    return res.data?.data ?? res.data;
  },

  async update(input: UpdateEmployeeInput): Promise<Employee> {
    const res = await api.put(BASE, input);
    return res.data?.data ?? res.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async getProjects(id: string): Promise<EmployeeProject[]> {
    const res = await api.get(`${BASE}/${id}/projects`);
    return res.data?.data ?? res.data ?? [];
  }
};
