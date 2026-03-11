import { z } from 'zod';

import api from '@app/api';

const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phoneNumber: z.string().nullish(),
  userId: z.string().nullish(),
});

export type Employee = z.infer<typeof employeeSchema>;

export interface ListEmployeesParams {
  page?: number;
  size?: number;
}

const BASE = '/hr/employee';

export const employeesApi = {
  async list(params?: ListEmployeesParams): Promise<{ data: Employee[]; pagination: unknown }> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    const res = await api.get(BASE, { params: query });
    const raw = res.data?.data ?? res.data ?? [];
    return {
      data: z.array(employeeSchema).parse(raw),
      pagination: res.data?.pagination,
    };
  },
};
