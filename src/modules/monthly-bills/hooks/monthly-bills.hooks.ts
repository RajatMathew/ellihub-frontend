import { monthlyBillsApi } from '@/modules/monthly-bills/api/monthly-bills.api';
import { useQuery } from '@tanstack/react-query';

export const monthlyBillsKeys = {
  all: ['monthly-bills'] as const,
  subcontractorPOGroups: () => [...monthlyBillsKeys.all, 'subcontractor-po-groups'] as const,
};

export const useMonthlyBillsSubcontractorPOGroupsQuery = (enabled = true) =>
  useQuery({
    queryKey: monthlyBillsKeys.subcontractorPOGroups(),
    queryFn: () => monthlyBillsApi.getSubcontractorPOGroups(),
    enabled,
  });
