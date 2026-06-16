import { invoiceApi } from '@/modules/project/api/invoice';
import { invoiceKeys } from '@/modules/project/constants/invoice';
import type { ListInvoiceParams } from '@/modules/project/schemas/invoice';
import { useQuery } from '@tanstack/react-query';

export const useInvoiceListQuery = (params: ListInvoiceParams) =>
  useQuery({
    queryKey: [...invoiceKeys.list(params.projectId ?? 'all'), params],
    queryFn: () => invoiceApi.list(params),
    enabled: !!params.projectId,
  });

export const useInvoiceStatsQuery = (projectId: string) =>
  useQuery({
    queryKey: invoiceKeys.stats(projectId),
    queryFn: () => invoiceApi.stats(projectId),
    enabled: !!projectId,
  });

export const useInvoiceDetailQuery = (id: string) =>
  useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoiceApi.getById(id),
    enabled: !!id,
  });

export const useInvoicesByPurchaseOrderQuery = (poId: string) =>
  useQuery({
    queryKey: invoiceKeys.byPurchaseOrder(poId),
    queryFn: () => invoiceApi.listByPurchaseOrder(poId),
    enabled: !!poId,
  });

export const useInvoiceStatusesQuery = () =>
  useQuery({
    queryKey: invoiceKeys.statuses(),
    queryFn: () => invoiceApi.listStatuses(),
  });
