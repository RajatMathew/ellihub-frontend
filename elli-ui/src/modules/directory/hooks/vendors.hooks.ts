import { toastApiError } from '@/app/lib/toast-api-error';
import { vendorsApi } from '@/modules/directory/api/vendors.api';
import { vendorsKeys } from '@/modules/directory/constants/vendors.keys';
import type {
  CreateVendorContactInput,
  CreateVendorInput,
  ListVendorsParams,
  UpdateVendorContactInput,
  UpdateVendorInput,
} from '@/modules/directory/schemas/vendor.schema';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* ---- queries ---- */

export const useVendorsQuery = (params?: ListVendorsParams) =>
  useQuery({
    queryKey: [...vendorsKeys.list(), params],
    queryFn: () => vendorsApi.list(params),
  });

export const useVendorDetailQuery = (id: string) =>
  useQuery({
    queryKey: vendorsKeys.detail(id),
    queryFn: () => vendorsApi.getById(id),
    enabled: !!id,
  });

export const useVendorTypesQuery = () =>
  useQuery({
    queryKey: ['vendors', 'types'],
    queryFn: () => vendorsApi.getTypes(),
  });

export const useVendorStatsQuery = () =>
  useQuery({
    queryKey: [...vendorsKeys.all, 'stats'],
    queryFn: () => vendorsApi.stats(),
  });

/* ---- mutations ---- */

export const useCreateVendorMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorInput) => vendorsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to create vendor.'),
  });
};

export const useUpdateVendorMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorInput }) =>
      vendorsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: vendorsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to update vendor.'),
  });
};

export const useDeleteVendorMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vendorsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to archive vendor.'),
  });
};

/* ---- vendor contact mutations ---- */

export const useAddVendorContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateVendorContactInput }) =>
      vendorsApi.addContact(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: vendorsKeys.detail(id) });
    },
    onError: (error) => toastApiError(error, 'Failed to add vendor contact.'),
  });
};

export const useUpdateVendorContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      contactId,
      data,
    }: {
      id: string;
      contactId: string;
      data: UpdateVendorContactInput;
    }) => vendorsApi.updateContact(id, contactId, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: vendorsKeys.detail(id) });
    },
    onError: (error) => toastApiError(error, 'Failed to update vendor contact.'),
  });
};

export const useDeleteVendorContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contactId }: { id: string; contactId: string }) =>
      vendorsApi.removeContact(id, contactId),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: vendorsKeys.detail(id) });
    },
    onError: (error) => toastApiError(error, 'Failed to remove vendor contact.'),
  });
};
