import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { invoiceApi } from '@/modules/project/api/invoice';
import { invoiceKeys } from '@/modules/project/constants/invoice';
import type {
  InvoiceDisputeInput,
  InvoiceMarkPaidInput,
  InvoiceRejectInput,
  InvoiceResolveDisputeInput,
} from '@/modules/project/schemas/invoice';

import { toastInvoiceApiError } from './invoice-error';

export const useApproveInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceApi.approve(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice approved.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to approve invoice.'),
  });
};

export const useRejectInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceRejectInput }) =>
      invoiceApi.reject(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice rejected.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to reject invoice.'),
  });
};

export const useMarkPaidInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceMarkPaidInput }) =>
      invoiceApi.markPaid(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice marked as paid.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to mark invoice as paid.'),
  });
};

export const useMarkUnpaidInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceApi.markUnpaid(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice marked as unpaid.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to mark invoice as unpaid.'),
  });
};

export const useDisputeInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceDisputeInput }) =>
      invoiceApi.dispute(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice disputed.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to dispute invoice.'),
  });
};

export const useResolveDisputeInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceResolveDisputeInput }) =>
      invoiceApi.resolveDispute(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Dispute resolved.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to resolve dispute.'),
  });
};
