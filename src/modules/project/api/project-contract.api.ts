import api from '@/app/api';

import {
  primeContractSchema,
  type PrimeContract,
} from '@/modules/project/schemas/project-contract.schema';

const BASE = '/project';

export const projectContractApi = {
  async get(projectId: string): Promise<PrimeContract> {
    const res = await api.get(`${BASE}/${projectId}/contract`);
    const raw = res.data?.data ?? res.data;
    const result = primeContractSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },
};
