import api from '@/app/api';
import {
  monthlyBillsSubcontractorPOGroupsSchema,
  type MonthlyBillsSubcontractorPOGroup,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';

const BASE = '/monthly-bills';

export const monthlyBillsApi = {
  async getSubcontractorPOGroups(): Promise<MonthlyBillsSubcontractorPOGroup[]> {
    const res = await api.get(`${BASE}/subcontractor/purchase-orders`);
    const raw = res.data?.data ?? res.data;
    const result = monthlyBillsSubcontractorPOGroupsSchema.safeParse(raw);
    if (!result.success) {
      throw result.error;
    }
    return result.data;
  },
};
