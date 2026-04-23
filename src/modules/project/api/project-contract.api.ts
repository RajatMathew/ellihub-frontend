import api from '@app/api';

import {
  primeContractSchema,
  type PrimeContract,
  type UpsertPrimeContractInput,
} from '@modules/project/schemas/project-contract.schema';

const BASE = '/project';

export const projectContractApi = {
  async get(projectId: string): Promise<PrimeContract> {
    const res = await api.get(`${BASE}/${projectId}/contract`);
    const raw = res.data?.data ?? res.data;
    const result = primeContractSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectContractApi.get] Zod parse error:', result.error.issues);
      console.error('[projectContractApi.get] Raw response:', JSON.stringify(raw, null, 2));
      throw result.error;
    }
    return result.data;
  },

  async upsert(projectId: string, data: UpsertPrimeContractInput): Promise<PrimeContract> {
    const res = await api.put(`${BASE}/${projectId}/contract`, data);
    const raw = res.data?.data ?? res.data;
    const result = primeContractSchema.safeParse(raw);
    if (!result.success) {
      console.error('[projectContractApi.upsert] Zod parse error:', result.error.issues);
      throw result.error;
    }
    return result.data;
  },

  async addAttachment(data: { projectId: string; fileId: string }): Promise<void> {
    await api.patch(`${BASE}/prime-contract/add`, data);
  },
};
