import { type AxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { rfqApi } from '@modules/project/api/rfq.api';
import { rfqKeys } from '@modules/project/constants/rfq.keys';
import type {
  AwardRFQInput,
  CancelRFQInput,
  CreateRFQInput,
  ListRFQParams,
  PublishRFQInput,
  RFQDeliverableInput,
  UpdateRFQInput,
  VoidAwardInput,
} from '@modules/project/schemas/rfq.schema';

/* ---- helpers ---- */

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosErr = error as AxiosError<{
    message?: string;
    details?: { details?: { path?: string[]; message?: string }[] };
  }>;
  const data = axiosErr?.response?.data;
  if (data?.details?.details?.length) {
    const msgs = data.details.details
      .map((d) => {
        const field = d.path?.join('.') ?? '';
        return field ? `${field}: ${d.message}` : d.message;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join('; ');
  }
  return data?.message ?? fallback;
}

function toastApiError(error: unknown, fallback: string) {
  toast.error(getApiErrorMessage(error, fallback));
}

/* ---- queries ---- */

export const useRFQListQuery = (params: ListRFQParams) =>
  useQuery({
    queryKey: [...rfqKeys.list(params.projectId), params],
    queryFn: () => rfqApi.list(params),
    enabled: !!params.projectId,
  });

export const useRFQStatusesQuery = () =>
  useQuery({
    queryKey: rfqKeys.statuses(),
    queryFn: () => rfqApi.listStatuses(),
  });

export const useRFQDetailQuery = (id: string) =>
  useQuery({
    queryKey: rfqKeys.detail(id),
    queryFn: () => rfqApi.getById(id),
    enabled: !!id,
  });

export const useBidComparisonQuery = (rfqId: string, enabled = false) =>
  useQuery({
    queryKey: [...rfqKeys.detail(rfqId), 'bid-comparison'],
    queryFn: () => rfqApi.getBidComparison(rfqId),
    enabled: !!rfqId && enabled,
  });

/* ---- mutations ---- */

export const useCreateRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRFQInput) => rfqApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      toast.success('RFQ created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create RFQ.'),
  });
};

export const useUpdateRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRFQInput }) => rfqApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      toast.success('RFQ updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update RFQ.'),
  });
};

export const useDeleteRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rfqApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      toast.success('RFQ deleted.');
    },
    onError: (err) => toastApiError(err, 'Failed to delete RFQ.'),
  });
};

/* ---- deliverable mutations ---- */

export const useAddRFQDeliverableMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, data }: { rfqId: string; data: RFQDeliverableInput }) =>
      rfqApi.addDeliverable(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add deliverable.'),
  });
};

export const useUpdateRFQDeliverableMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      deliverableId,
      data,
    }: {
      rfqId: string;
      deliverableId: string;
      data: Partial<RFQDeliverableInput>;
    }) => rfqApi.updateDeliverable(rfqId, deliverableId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
    onError: (err) => toastApiError(err, 'Failed to update deliverable.'),
  });
};

export const useRemoveRFQDeliverableMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, deliverableId }: { rfqId: string; deliverableId: string }) =>
      rfqApi.removeDeliverable(rfqId, deliverableId),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove deliverable.'),
  });
};

/* ---- quote mutations ---- */

export const useCreateQuoteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      data,
    }: {
      rfqId: string;
      data: {
        vendorId: string;
        lineItems: { deliverableId: string; unitPrice: number; quantity: number; unit: string }[];
        leadTimeDays?: number;
        notes?: string;
      };
    }) => rfqApi.createQuote(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
      toast.success('Quote submitted.');
    },
    onError: (err) => toastApiError(err, 'Failed to submit quote.'),
  });
};

export const useUpdateQuoteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      quoteId,
      data,
    }: {
      rfqId: string;
      quoteId: string;
      data: {
        lineItems: { deliverableId: string; unitPrice: number; quantity: number; unit: string }[];
        leadTimeDays?: number | null;
        notes?: string | null;
      };
    }) => rfqApi.updateQuote(rfqId, quoteId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
      toast.success('Quote updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update quote.'),
  });
};

/* ---- status mutations ---- */

export const useChangeRFQStatusMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      rfqApi.changeStatus(id, statusId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      toast.success('Status updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update status.'),
  });
};

/* ---- invite action mutations ---- */

export const useDeclineInviteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      inviteId,
      data,
    }: {
      rfqId: string;
      inviteId: string;
      data: { declineReason?: string };
    }) => rfqApi.declineInvite(rfqId, inviteId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
      toast.success('Invite declined.');
    },
    onError: (err) => toastApiError(err, 'Failed to decline invite.'),
  });
};

/* ---- vendor invite mutations ---- */

export const useInviteVendorsMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      data,
    }: {
      rfqId: string;
      data: { vendorIds: string[]; sendInviteEmails?: boolean };
    }) => rfqApi.inviteVendors(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
      toast.success('Vendors invited.');
    },
    onError: (err) => toastApiError(err, 'Failed to invite vendors.'),
  });
};

/* ---- workflow mutations ---- */

export const usePublishRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PublishRFQInput }) => rfqApi.publish(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      toast.success('RFQ published.');
    },
    onError: (err) => toastApiError(err, 'Failed to publish RFQ.'),
  });
};

export const useCancelRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CancelRFQInput }) => rfqApi.cancel(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      toast.success('RFQ cancelled.');
    },
    onError: (err) => toastApiError(err, 'Failed to cancel RFQ.'),
  });
};

export const useAwardRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AwardRFQInput }) => rfqApi.award(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      toast.success('RFQ awarded.');
    },
    onError: (err) => toastApiError(err, 'Failed to award RFQ.'),
  });
};

export const useVoidAwardMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoidAwardInput }) => rfqApi.voidAward(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      toast.success('Award voided.');
    },
    onError: (err) => toastApiError(err, 'Failed to void award.'),
  });
};

export const useUnawardRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rfqApi.unaward(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(id) });
      toast.success('Award removed.');
    },
    onError: (err) => toastApiError(err, 'Failed to unaward.'),
  });
};

export const useGeneratePOMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      data,
    }: {
      rfqId: string;
      data: { vendorInviteId: string; taxPercent?: number; paymentTerms?: string; notes?: string };
    }) => rfqApi.generatePO(rfqId, data),
    onSuccess: (_, { rfqId }) => {
      qc.invalidateQueries({ queryKey: rfqKeys.all });
      qc.invalidateQueries({ queryKey: rfqKeys.detail(rfqId) });
      toast.success('Purchase Order created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create Purchase Order.'),
  });
};
