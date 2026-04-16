import { z } from 'zod';
import api from '@app/api';
import { lookupSchema, type Lookup, type LookupType } from '../schemas/lookup.schema';

const BASE = '/lookup';

export const lookupApi = {
  /**
   * List all lookups
   */
  async listAll(): Promise<Lookup[]> {
    const res = await api.get(BASE);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(lookupSchema).safeParse(raw);
    if (!result.success) {
      console.error('[lookupApi.listAll] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /**
   * List lookups by type
   */
  async listByType(type: LookupType | string): Promise<Lookup[]> {
    const res = await api.get(`${BASE}/type/${type}`);
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(lookupSchema).safeParse(raw);
    if (!result.success) {
      console.error(`[lookupApi.listByType] Zod parse error for type ${type}:`, result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /**
   * Get a lookup by ID
   */
  async getById(id: string): Promise<Lookup> {
    const res = await api.get(`${BASE}/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = lookupSchema.safeParse(raw);
    if (!result.success) {
      console.error(`[lookupApi.getById] Zod parse error for id ${id}:`, result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  /**
   * Create a lookup
   */
  async create(data: Partial<Lookup>): Promise<Lookup> {
    const res = await api.post(BASE, data);
    const raw = res.data?.data ?? res.data;
    return lookupSchema.parse(raw);
  },

  /**
   * Update a lookup
   */
  async update(id: string, data: Partial<Lookup>): Promise<Lookup> {
    const res = await api.put(`${BASE}/${id}`, data);
    const raw = res.data?.data ?? res.data;
    return lookupSchema.parse(raw);
  },

  /**
   * Delete a lookup
   */
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
