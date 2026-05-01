import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invoiceApi } from '@/modules/project/api/invoice';
import { invoiceKeys } from '@/modules/project/constants/invoice';
import type { InvoiceLineItemInput } from '@/modules/project/schemas/invoice';

import { toastInvoiceApiError } from './invoice-error';

export const useAddInvoiceLineItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: InvoiceLineItemInput }) =>
      invoiceApi.addLineItem(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to add line item.'),
  });
};

export const useUpdateInvoiceLineItemMutation = () => {
  const queryClient = useQueryClient();

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
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to update line item.'),
  });
};

export const useRemoveInvoiceLineItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, lineItemId }: { invoiceId: string; lineItemId: string }) =>
      invoiceApi.removeLineItem(invoiceId, lineItemId),
    onSuccess: (_, { invoiceId }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to remove line item.'),
  });
};
