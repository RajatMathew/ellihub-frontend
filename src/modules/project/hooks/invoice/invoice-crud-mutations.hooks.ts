import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { invoiceApi } from '@/modules/project/api/invoice';
import { invoiceKeys } from '@/modules/project/constants/invoice';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from '@/modules/project/schemas/invoice';

import { toastInvoiceApiError } from './invoice-error';

export const useCreateInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => invoiceApi.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success('Invoice created.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to create invoice.'),
  });
};

export const useUpdateInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvoiceInput }) =>
      invoiceApi.update(id, data),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(id) });
      toast.success('Invoice updated.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to update invoice.'),
  });
};

export const useDeleteInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceKeys.all });
      toast.success('Invoice deleted.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to delete invoice.'),
  });
};
