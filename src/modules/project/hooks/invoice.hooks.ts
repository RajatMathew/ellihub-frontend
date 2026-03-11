import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type AxiosError } from 'axios';
import { toast } from 'sonner';

import { invoiceApi } from '@modules/project/api/invoice.api';
import { invoiceKeys } from '@modules/project/constants/invoice.keys';
import type {
  ListInvoiceParams,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceRejectInput,
  InvoiceMarkPaidInput,
  InvoiceDisputeInput,
  InvoiceResolveDisputeInput,
  InvoiceLineItemInput,
} from '@modules/project/schemas/invoice.schema';

/* ---- error helper ---- */

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
    if (msgs.length) return msgs.join('\n');
  }
  if (data?.message) return data.message;
  return fallback;
}

function toastApiError(error: unknown, fallback: string) {
  toast.error(getApiErrorMessage(error, fallback));
}

/* ---- queries ---- */

export const useInvoiceListQuery = (params: ListInvoiceParams) =>
  useQuery({
    queryKey: [...invoiceKeys.list(params.projectId), params],
    queryFn: () => invoiceApi.list(params),
    enabled: !!params.projectId,
  });

export const useInvoiceDetailQuery = (id: string) =>
  useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => invoiceApi.getById(id),
    enabled: !!id,
  });

export const useInvoiceStatusesQuery = () =>
  useQuery({
    queryKey: invoiceKeys.statuses(),
    queryFn: () => invoiceApi.listStatuses(),
  });

/* ---- CRUD mutations ---- */

export const useCreateInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => invoiceApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success('Invoice created.');
    },
    onError: (err) => toastApiError(err, 'Failed to create invoice.'),
  });
};

export const useUpdateInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceInput }) => invoiceApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice updated.');
    },
    onError: (err) => toastApiError(err, 'Failed to update invoice.'),
  });
};

export const useDeleteInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success('Invoice deleted.');
    },
    onError: (err) => toastApiError(err, 'Failed to delete invoice.'),
  });
};

/* ---- workflow mutations ---- */

export const useApproveInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => invoiceApi.approve(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice approved.');
    },
    onError: (err) => toastApiError(err, 'Failed to approve invoice.'),
  });
};

export const useRejectInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceRejectInput }) => invoiceApi.reject(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice rejected.');
    },
    onError: (err) => toastApiError(err, 'Failed to reject invoice.'),
  });
};

export const useMarkPaidInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceMarkPaidInput }) => invoiceApi.markPaid(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice marked as paid.');
    },
    onError: (err) => toastApiError(err, 'Failed to mark invoice as paid.'),
  });
};

export const useDisputeInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceDisputeInput }) => invoiceApi.dispute(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice disputed.');
    },
    onError: (err) => toastApiError(err, 'Failed to dispute invoice.'),
  });
};

export const useResolveDisputeInvoiceMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceResolveDisputeInput }) =>
      invoiceApi.resolveDispute(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.all });
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Dispute resolved.');
    },
    onError: (err) => toastApiError(err, 'Failed to resolve dispute.'),
  });
};

/* ---- line item mutations ---- */

export const useAddInvoiceLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: InvoiceLineItemInput }) =>
      invoiceApi.addLineItem(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (err) => toastApiError(err, 'Failed to add line item.'),
  });
};

export const useUpdateInvoiceLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      lineItemId,
      data,
    }: {
      invoiceId: string;
      lineItemId: string;
      data: InvoiceLineItemInput;
    }) => invoiceApi.updateLineItem(invoiceId, lineItemId, data),
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (err) => toastApiError(err, 'Failed to update line item.'),
  });
};

export const useRemoveInvoiceLineItemMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, lineItemId }: { invoiceId: string; lineItemId: string }) =>
      invoiceApi.removeLineItem(invoiceId, lineItemId),
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (err) => toastApiError(err, 'Failed to remove line item.'),
  });
};
