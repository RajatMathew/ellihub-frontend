import { z } from 'zod';

import api from '@/app/api';
import {
  lookupSchema,
  lookupListSchema,
  type Lookup,
  type LookupCreate,
  type LookupUpdate,
} from '@/modules/lookup/schemas/lookup.schema';

const BASE = '/lookup';

export const lookupApi = {
  /** GET /lookup – List all lookups */
  async listAll(): Promise<Lookup[]> {
    const res = await api.get(BASE);
    const raw = res.data?.data ?? res.data ?? [];
    const result = lookupListSchema.safeParse(raw);
    if (!result.success) {
      console.warn('[lookupApi.listAll] Validation failed:', result.error.format());
      return raw as Lookup[];
    }
    return result.data;
  },

  /** GET /lookup/type/:type – List lookups by type */
  async listByType(type: string): Promise<Lookup[]> {
    const res = await api.get(`${BASE}/type/${type}`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(lookupSchema).safeParse(raw);
    if (!result.success) {
      console.warn('[lookupApi.listByType] Validation failed:', result.error.format());
      return raw as Lookup[];
    }
    return result.data;
  },

  /** GET /lookup/:id – Get a single lookup */
  async get(id: string): Promise<Lookup> {
    const res = await api.get(`${BASE}/${id}`);
    return lookupSchema.parse(res.data?.data ?? res.data);
  },

  /** POST /lookup – Create a new lookup */
  async create(data: LookupCreate): Promise<Lookup> {
    const res = await api.post(BASE, data);
    return lookupSchema.parse(res.data?.data ?? res.data);
  },

  /** PUT /lookup – Update an existing lookup */
  async update(data: LookupUpdate): Promise<Lookup> {
    const res = await api.put(BASE, data);
    return lookupSchema.parse(res.data?.data ?? res.data);
  },

  /** DELETE /lookup/:id – Delete a lookup */
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
