import { toastApiError } from '@/app/lib/toast-api-error';
import { rfqApi } from '@/modules/project/api/rfq';
import { rfqKeys } from '@/modules/project/constants/rfq';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';
import type {
  CreateRFQInput,
  CreatePOFromRFQInput,
  ListRFQParams,
  RFQDeliverableInput,
  UpdateRFQInput,
  VoidAwardInput,
} from '@/modules/project/schemas/rfq';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

function invalidateRFQQueries(queryClient: QueryClient, rfqId?: string) {
  return invalidateProjectQueries(
    queryClient,
    rfqId ? [rfqKeys.all, rfqKeys.detail(rfqId)] : [rfqKeys.all]
  );
}

function invalidateRFQDetail(queryClient: QueryClient, rfqId: string) {
  return invalidateProjectQueries(queryClient, [rfqKeys.detail(rfqId)]);
}

/* ---- queries ---- */

export const useRFQListQuery = (params: ListRFQParams) =>
  useQuery({
    queryKey: [...rfqKeys.list(params.projectId || 'all'), params],
    queryFn: () => rfqApi.list(params),
    enabled: !!params.projectId,
  });

export const useRFQStatusesQuery = () =>
  useQuery({
    queryKey: rfqKeys.statuses(),
    queryFn: () => rfqApi.getStatuses(),
  });

export const useRFQTypesQuery = () =>
  useQuery({
    queryKey: [...rfqKeys.all, 'types'],
    queryFn: () => rfqApi.getTypes(),
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
    onSuccess: async () => {
      await invalidateRFQQueries(qc);
      toast.success('RFQ created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create RFQ.'),
  });
};

export const useUpdateRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRFQInput }) => rfqApi.update(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateRFQQueries(qc, id);
      toast.success('RFQ updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update RFQ.'),
  });
};

export const useDeleteRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rfqApi.remove(id),
    onSuccess: async () => {
      await invalidateRFQQueries(qc);
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
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQDetail(qc, rfqId);
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
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQDetail(qc, rfqId);
    },
    onError: (err) => toastApiError(err, 'Failed to update deliverable.'),
  });
};

export const useRemoveRFQDeliverableMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rfqId, deliverableId }: { rfqId: string; deliverableId: string }) =>
      rfqApi.removeDeliverable(rfqId, deliverableId),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQDetail(qc, rfqId);
    },
    onError: (err) => toastApiError(err, 'Failed to remove deliverable.'),
  });
};

/* ---- quote mutations ---- */

export const useSubmitQuoteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
    }: {
      rfqId: string;
      data: { id: string; quotedAmount: number; leadTime?: string; attachments?: string[] };
    }) => rfqApi.submitQuote(data),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('Quote submitted.');
    },
    onError: (err) => toastApiError(err, 'Failed to submit quote.'),
  });
};

export const useEditQuoteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
    }: {
      rfqId: string;
      data: { id: string; quotedAmount: number; leadTime?: string; attachments?: string[] };
    }) => rfqApi.editQuote(data),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('Quote updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update quote.'),
  });
};

export const useRemoveQuoteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { rfqId: string; id: string }) => rfqApi.removeQuote(id),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('Quote removed.');
    },
    onError: (err) => toastApiError(err, 'Failed to remove quote.'),
  });
};

/* ---- status mutations ---- */

export const useChangeRFQStatusMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      rfqApi.changeStatus(id, statusId),
    onSuccess: async (_, { id }) => {
      await invalidateRFQQueries(qc, id);
      toast.success('Status updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update status.'),
  });
};

/* ---- invite action mutations ---- */

export const useDeclineInviteMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }: { rfqId: string; data: { id: string; declineReason?: string } }) =>
      rfqApi.declineInvite(data),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('Invite declined.');
    },
    onError: (err) => toastApiError(err, 'Failed to decline invite.'),
  });
};

/* ---- vendor invite mutations ---- */

export const useAddVendorMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { rfqId: string; vendorId: string }) => rfqApi.addVendor(data),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('Vendor added.');
    },
    onError: (err) => toastApiError(err, 'Failed to add vendor.'),
  });
};

export const useRemoveVendorMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId }: { rfqId: string; quoteId: string }) => rfqApi.removeVendor(quoteId),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('Vendor removed.');
    },
    onError: (err) => toastApiError(err, 'Failed to remove vendor.'),
  });
};

export const useGenerateRFQVendorPdfMutation = () =>
  useMutation({
    mutationFn: ({ quoteId, vendorName }: { quoteId: string; vendorName: string }) =>
      rfqApi.generateVendorPdf(quoteId, vendorName),
    onError: (err) => toastApiError(err, 'Failed to generate RFQ PDF.'),
  });

/* ---- workflow mutations ---- */

export const usePublishRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rfqApi.publish(id),
    onSuccess: async (_, id) => {
      await invalidateRFQQueries(qc, id);
      toast.success('RFQ published.');
    },
    onError: (err) => toastApiError(err, 'Failed to publish RFQ.'),
  });
};

export const useCancelRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cancellationReason }: { id: string; cancellationReason?: string }) =>
      rfqApi.cancel(id, cancellationReason),
    onSuccess: async (_, { id }) => {
      await invalidateRFQQueries(qc, id);
      toast.success('RFQ cancelled.');
    },
    onError: (err) => toastApiError(err, 'Failed to cancel RFQ.'),
  });
};

export const useAwardRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId }: { rfqId: string; quoteId: string }) => rfqApi.award(quoteId),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('RFQ awarded.');
    },
    onError: (err) => toastApiError(err, 'Failed to award RFQ.'),
  });
};

export const useVoidAwardMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoidAwardInput }) => rfqApi.voidAward(id, data),
    onSuccess: async (_, { id }) => {
      await invalidateRFQQueries(qc, id);
      toast.success('Award voided.');
    },
    onError: (err) => toastApiError(err, 'Failed to void award.'),
  });
};

export const useUnawardRFQMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rfqApi.unaward(id),
    onSuccess: async (_, id) => {
      await invalidateRFQQueries(qc, id);
      toast.success('Award removed.');
    },
    onError: (err) => toastApiError(err, 'Failed to remove award.'),
  });
};

/* ---- attachment mutations ---- */

export const useAddRFQAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { rfqId: string; documentId: string }) => rfqApi.addAttachment(data),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQDetail(qc, rfqId);
      toast.success('Attachment added.');
    },
    onError: (err) => toastApiError(err, 'Failed to add attachment.'),
  });
};

export const useRemoveRFQAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ attachmentId }: { rfqId: string; attachmentId: string }) =>
      rfqApi.removeAttachment(attachmentId),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQDetail(qc, rfqId);
      toast.success('Attachment removed.');
    },
    onError: (err) => toastApiError(err, 'Failed to remove attachment.'),
  });
};

/* ---- quote attachment mutations ---- */

export const useAddQuoteAttachmentMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      rfqId,
      quoteId,
      data,
    }: {
      rfqId: string;
      quoteId: string;
      data: { fileId: string };
    }) => rfqApi.addQuoteAttachment(rfqId, quoteId, data),
    onSuccess: async (_, { rfqId }) => {
      await invalidateRFQDetail(qc, rfqId);
      toast.success('Quote document uploaded.');
    },
    onError: (err) => toastApiError(err, 'Failed to upload quote document.'),
  });
};

export const useGeneratePOMutation = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  return useMutation({
    mutationFn: ({ rfqId, data }: { rfqId: string; data: CreatePOFromRFQInput }) =>
      rfqApi.generatePO(rfqId, data),
    onSuccess: async (data, { rfqId }) => {
      await invalidateRFQQueries(qc, rfqId);
      toast.success('Purchase Order created.');

      const poId =
        typeof data === 'object' && data !== null && 'id' in data && typeof data.id === 'string'
          ? data.id
          : undefined;
      if (poId && projectId) {
        navigate(`/app/project/${projectId}/purchase-orders/${poId}`);
      }
    },
    onError: (err) => toastApiError(err, 'Failed to create Purchase Order.'),
  });
};
