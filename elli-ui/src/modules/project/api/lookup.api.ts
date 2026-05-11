import { z } from 'zod';

import api from '@/app/api';
import { lookupSchema, type Lookup, type LookupType } from '@/modules/project/schemas/lookup.schema';

const BASE = '/lookup';

export const lookupApi = {
  async listAll(): Promise<Lookup[]> {
    const res = await api.get(BASE);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(lookupSchema).safeParse(raw);
    if (!result.success) throw result.error;
    return result.data;
  },

  async listByType(type: LookupType | string): Promise<Lookup[]> {
    const res = await api.get(`${BASE}/type/${type}`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(lookupSchema).safeParse(raw);
    if (!result.success) throw result.error;
    return result.data;
  },
};
