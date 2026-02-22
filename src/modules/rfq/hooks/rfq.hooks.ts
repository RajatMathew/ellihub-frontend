import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import {
  addDeliverable,
  awardRFQ,
  closeRFQ,
  createRFQ,
  deleteRFQ,
  getBidComparison,
  getRFQ,
  getRFQs,
  publishRFQ,
  removeDeliverable,
  submitQuotation,
  updateDeliverable,
  updateQuotation,
  updateRFQ,
  type AwardRFQRequest,
  type AwardRFQResponse,
  type DeliverableCreateRequest,
  type DeliverableUpdateRequest,
  type PaginatedResponse,
  type QuotationCreateRequest,
  type QuotationUpdateRequest,
  type RFQListParams,
} from '../api/rfq.api';
import type {
  BidComparison,
  RFQ,
  RFQCreateRequest,
  RFQDeliverable,
  RFQListItem,
  RFQUpdateRequest,
  VendorQuotation,
} from '../types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const rfqKeys = {
  all: ['rfqs'] as const,
  list: (params?: RFQListParams) => ['rfqs', params] as const,
  detail: (id: string) => ['rfq', id] as const,
  bidComparison: (rfqId: string) => ['rfq', rfqId, 'bid-comparison'] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useRFQs(
  params?: RFQListParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<RFQListItem>>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<PaginatedResponse<RFQListItem>>({
    queryKey: rfqKeys.list(params),
    queryFn: () => getRFQs(params),
    ...options,
  });
}

export function useRFQ(
  id: string,
  options?: Omit<UseQueryOptions<RFQ>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<RFQ>({
    queryKey: rfqKeys.detail(id),
    queryFn: () => getRFQ(id),
    enabled: !!id,
    ...options,
  });
}

export function useBidComparison(
  rfqId: string,
  options?: Omit<UseQueryOptions<BidComparison>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<BidComparison>({
    queryKey: rfqKeys.bidComparison(rfqId),
    queryFn: () => getBidComparison(rfqId),
    enabled: !!rfqId,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// RFQ mutations
// ---------------------------------------------------------------------------

export function useCreateRFQ() {
  const queryClient = useQueryClient();

  return useMutation<RFQ, Error, RFQCreateRequest>({
    mutationFn: createRFQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
    },
  });
}

export function useUpdateRFQ() {
  const queryClient = useQueryClient();

  return useMutation<RFQ, Error, { id: string; data: RFQUpdateRequest }>({
    mutationFn: ({ id, data }) => updateRFQ(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
    },
  });
}

export function useDeleteRFQ() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteRFQ,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: rfqKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
    },
  });
}

export function usePublishRFQ() {
  const queryClient = useQueryClient();

  return useMutation<RFQ, Error, string>({
    mutationFn: publishRFQ,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
    },
  });
}

export function useCloseRFQ() {
  const queryClient = useQueryClient();

  return useMutation<RFQ, Error, string>({
    mutationFn: closeRFQ,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
    },
  });
}

export function useAwardRFQ() {
  const queryClient = useQueryClient();

  return useMutation<AwardRFQResponse, Error, { rfqId: string; data: AwardRFQRequest }>({
    mutationFn: ({ rfqId, data }) => awardRFQ(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
      // Invalidate purchase orders list — new PO was created
      queryClient.invalidateQueries({ queryKey: ['pos'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Deliverable mutations
// ---------------------------------------------------------------------------

export function useAddDeliverable() {
  const queryClient = useQueryClient();

  return useMutation<
    RFQDeliverable,
    Error,
    { rfqId: string; data: DeliverableCreateRequest }
  >({
    mutationFn: ({ rfqId, data }) => addDeliverable(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
  });
}

export function useUpdateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation<
    RFQDeliverable,
    Error,
    { rfqId: string; deliverableId: string; data: DeliverableUpdateRequest }
  >({
    mutationFn: ({ rfqId, deliverableId, data }) =>
      updateDeliverable(rfqId, deliverableId, data),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
  });
}

export function useRemoveDeliverable() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { rfqId: string; deliverableId: string }>({
    mutationFn: ({ rfqId, deliverableId }) => removeDeliverable(rfqId, deliverableId),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Quotation mutations
// ---------------------------------------------------------------------------

export function useSubmitQuotation() {
  const queryClient = useQueryClient();

  return useMutation<
    VendorQuotation,
    Error,
    { rfqId: string; data: QuotationCreateRequest }
  >({
    mutationFn: ({ rfqId, data }) => submitQuotation(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation<
    VendorQuotation,
    Error,
    { rfqId: string; quotationId: string; data: QuotationUpdateRequest }
  >({
    mutationFn: ({ rfqId, quotationId, data }) =>
      updateQuotation(rfqId, quotationId, data),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
  });
}
