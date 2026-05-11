import api from '@/app/api';
import { z } from 'zod';

export const appLookupSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    label: z.string().optional(),
    code: z.string().optional(),
  })
  .passthrough();

export type AppLookup = z.infer<typeof appLookupSchema>;

const BASE = '/lookup';

export const appLookupApi = {
  async listByType(type: string): Promise<AppLookup[]> {
    const res = await api.get(`${BASE}/type/${type}`);
    return z.array(appLookupSchema).parse(res.data?.data ?? res.data ?? []);
  },
};
