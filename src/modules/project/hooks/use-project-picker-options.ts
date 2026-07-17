import { useCallback } from 'react';

import type { InfiniteMultiSearchSelectOption } from '@/app/components/ui/infinite-multi-search-select';
import type { InfiniteSearchSelectOption } from '@/app/components/ui/infinite-search-select';
import { useInfiniteSelectOptions } from '@/app/hooks/use-infinite-select-options';
import { formatCurrency } from '@/app/lib/helpers';
import type { CostCode } from '@/modules/catalog/schemas/costcode.schema';
import { primeChangeOrderApi } from '@/modules/project/api/prime-change-order';
import { projectApi } from '@/modules/project/api/project.api';
import { poApi } from '@/modules/project/api/purchase-order';
import { rfqApi } from '@/modules/project/api/rfq';
import { scoApi } from '@/modules/project/api/sub-change-order';
import type { PrimeChangeOrder } from '@/modules/project/schemas/prime-change-order';
import type { POListItem, POStatusName } from '@/modules/project/schemas/purchase-order';
import type { RFQListItem } from '@/modules/project/schemas/rfq';
import type { SCOListItem, SCOStatusName } from '@/modules/project/schemas/sub-change-order';

export type ProjectPickerOption = InfiniteSearchSelectOption;
export type ProjectMultiPickerOption = InfiniteMultiSearchSelectOption;

type BasePickerParams<TOption> = {
  search: string;
  selectedOptions?: TOption[];
  enabled?: boolean;
  pageSize?: number;
  queryScope?: string;
};

type ProjectScopedPickerParams<TOption> = BasePickerParams<TOption> & {
  projectId: string;
};

function getRFQStatusName(rfq: RFQListItem) {
  if (typeof rfq.status === 'string') return rfq.status;
  return rfq.status?.name ?? rfq.status?.label ?? '';
}

export function toRFQPickerOption(rfq: RFQListItem): ProjectPickerOption {
  const label = rfq.rfqNumber ?? rfq.title;

  return {
    value: rfq.id,
    label,
    description: rfq.rfqNumber ? rfq.title : undefined,
    badge: getRFQStatusName(rfq) || undefined,
  };
}

export function toPurchaseOrderPickerOption(po: POListItem): ProjectPickerOption {
  return {
    value: po.id,
    label: po.poNumber ?? po.id,
    description: [po.vendor?.name, po.total ? formatCurrency(Number(po.total)) : undefined]
      .filter(Boolean)
      .join(' - '),
    badge: po.status,
  };
}

export function toSCOPickerOption(sco: SCOListItem): ProjectMultiPickerOption {
  return {
    value: sco.id,
    label: sco.scoNumber ?? sco.title ?? sco.id,
    description: sco.title ?? sco.purchaseOrder?.poNumber ?? undefined,
    badge: sco.status,
  };
}

export function toCostCodePickerOption(costCode: CostCode): ProjectPickerOption {
  return {
    value: costCode.id,
    label: `${costCode.code} - ${costCode.name}`,
    description: costCode.costCodeCategory?.name ?? costCode.description ?? undefined,
  };
}

export function toPrimeChangeOrderPickerOption(pco: PrimeChangeOrder): ProjectPickerOption {
  const label = [pco.referenceNumber, pco.name].filter(Boolean).join(' - ');

  return {
    value: pco.id,
    label: label || 'Prime Change Order',
    description: pco.statusName,
    badge: pco.scheduleImpact ? `Impact: ${pco.scheduleImpact}` : undefined,
    disabled: Boolean(pco.deletedAt || pco.fieldwireDeletedAt),
  };
}

export function useRFQPickerOptions({
  projectId,
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
  status,
}: ProjectScopedPickerParams<ProjectPickerOption> & { status?: string }) {
  return useInfiniteSelectOptions({
    queryKey: ['rfqs', queryScope, projectId, search, status, pageSize],
    queryFn: (page) =>
      rfqApi.list({
        projectId,
        search: search || undefined,
        statusId: status,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    mapItemToOption: toRFQPickerOption,
    selectedOptions,
    enabled: enabled && !!projectId,
  });
}

export function usePurchaseOrderPickerOptions({
  projectId,
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
  status,
}: ProjectScopedPickerParams<ProjectPickerOption> & { status?: POStatusName }) {
  return useInfiniteSelectOptions({
    queryKey: ['purchase-orders', queryScope, projectId, search, status, pageSize],
    queryFn: (page) =>
      poApi.list({
        projectId,
        status,
        search: search || undefined,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    mapItemToOption: toPurchaseOrderPickerOption,
    selectedOptions,
    enabled: enabled && !!projectId,
  });
}

export function useSCOPickerOptions({
  projectId,
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
  purchaseOrderId,
  status,
}: ProjectScopedPickerParams<ProjectMultiPickerOption> & {
  purchaseOrderId?: string;
  status?: SCOStatusName;
}) {
  return useInfiniteSelectOptions({
    queryKey: ['scos', queryScope, projectId, purchaseOrderId, search, status, pageSize],
    queryFn: (page) =>
      scoApi.list({
        projectId,
        purchaseOrderId,
        status,
        search: search || undefined,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    mapItemToOption: toSCOPickerOption,
    selectedOptions,
    enabled: enabled && !!projectId && (!purchaseOrderId || !!purchaseOrderId),
  });
}

export function useProjectCostCodePickerOptions({
  projectId,
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
}: ProjectScopedPickerParams<ProjectPickerOption>) {
  const mapItemToOption = useCallback((costCode: CostCode) => toCostCodePickerOption(costCode), []);

  return useInfiniteSelectOptions({
    queryKey: ['projects', projectId, 'cost-code-options', queryScope, search, pageSize],
    queryFn: (page) =>
      projectApi.listProjectCostCodeOptions(projectId, {
        search: search || undefined,
        page,
        size: pageSize,
        sortBy: 'code',
        sortOrder: 'asc',
      }),
    mapItemToOption,
    selectedOptions,
    enabled: enabled && !!projectId,
  });
}

export function usePrimeChangeOrderPickerOptions({
  projectId,
  search,
  selectedOptions,
  enabled = true,
  pageSize = 25,
  queryScope = 'picker',
}: ProjectScopedPickerParams<ProjectPickerOption>) {
  return useInfiniteSelectOptions({
    queryKey: ['prime-change-orders', queryScope, projectId, search, pageSize],
    queryFn: (page) =>
      primeChangeOrderApi.list({
        projectId,
        search: search || undefined,
        page,
        size: pageSize,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    mapItemToOption: toPrimeChangeOrderPickerOption,
    selectedOptions,
    enabled: enabled && !!projectId,
  });
}
