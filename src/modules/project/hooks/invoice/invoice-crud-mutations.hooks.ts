import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { invoiceApi } from '@/modules/project/api/invoice';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
} from '@/modules/project/schemas/invoice';

import { toastInvoiceApiError } from './invoice-error';
import { invalidateInvoiceQueries } from './invoice-query-invalidation';

export const useCreateInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => invoiceApi.create(data),
    onSuccess: async () => {
      await invalidateInvoiceQueries(queryClient);
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
    onSuccess: async (_, { id }) => {
      await invalidateInvoiceQueries(queryClient, id);
      toast.success('Invoice updated.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to update invoice.'),
  });
};

export const useDeleteInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoiceApi.remove(id),
    onSuccess: async () => {
      await invalidateInvoiceQueries(queryClient);
      toast.success('Invoice deleted.');
    },
    onError: (error) => toastInvoiceApiError(error, 'Failed to delete invoice.'),
  });
};
