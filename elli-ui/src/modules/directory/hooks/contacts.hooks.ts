import { toastApiError } from '@/app/lib/toast-api-error';
import { contactsApi } from '@/modules/directory/api/contacts.api';
import { contactsKeys } from '@/modules/directory/constants/contacts.keys';
import { gcKeys } from '@/modules/directory/constants/gc.keys';
import { vendorsKeys } from '@/modules/directory/constants/vendors.keys';
import {
  contactFormSchema,
  type Contact,
  type ContactEmail,
  type ContactFormValues,
  type ContactPhone,
  type CreateContactInput,
  type ListContactsParams,
  type UpdateContactInput,
} from '@/modules/directory/schemas/contact.schema';
import { filesKeys } from '@/modules/files/constants/files.keys';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';

/* ---- contact queries ---- */

export const useContactsQuery = (params?: ListContactsParams) =>
  useQuery({
    queryKey: [...contactsKeys.list(), params],
    queryFn: () => contactsApi.list(params),
  });

export const useContactDetailQuery = (id: string) =>
  useQuery({
    queryKey: contactsKeys.detail(id),
    queryFn: () => contactsApi.getById(id),
    enabled: !!id,
  });

export const useDirectoryKpisQuery = () =>
  useQuery({
    queryKey: contactsKeys.kpis(),
    queryFn: () => contactsApi.getDirectoryKpis(),
  });

export const useProfessionalRolesQuery = () =>
  useQuery({
    queryKey: contactsKeys.roles(),
    queryFn: () => contactsApi.getProfessionalRoles(),
  });

/* ---- contact mutations ---- */

export const useCreateContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to create contact.'),
  });
};

export const useUpdateContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactInput }) =>
      contactsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to update contact.'),
  });
};

export const useDeleteContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to delete contact.'),
  });
};

export const useAddContactTagMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, tag }: { contactId: string; tag: string }) =>
      contactsApi.addTag(contactId, tag),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
    },
    onError: (error) => toastApiError(error, 'Failed to add tag.'),
  });
};

export const useRemoveContactTagMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, tag }: { contactId: string; tag: string }) =>
      contactsApi.removeTag(contactId, tag),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
    },
    onError: (error) => toastApiError(error, 'Failed to remove tag.'),
  });
};

/* ---- phone mutations ---- */

export const useAddPhoneMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, phone }: { id: string; phone: ContactPhone }) =>
      contactsApi.addPhone(id, phone),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
    onError: (error) => toastApiError(error, 'Failed to add phone number.'),
  });
};

export const useRemovePhoneMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.removePhone(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
    onError: (error) => toastApiError(error, 'Failed to remove phone number.'),
  });
};

/* ---- email mutations ---- */

export const useAddEmailMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: ContactEmail }) =>
      contactsApi.addEmail(id, email),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
    onError: (error) => toastApiError(error, 'Failed to add email.'),
  });
};

export const useRemoveEmailMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.removeEmail(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
    onError: (error) => toastApiError(error, 'Failed to remove email.'),
  });
};

/* ---- entity linking mutations ---- */

export const useLinkEntityMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactsApi.linkEntity,
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to update entity link.'),
  });
};

export const useUnlinkEntityMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: string) => contactsApi.unlinkEntity(contactId),
    onSuccess: (_, contactId) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
      qc.invalidateQueries({ queryKey: vendorsKeys.all });
      qc.invalidateQueries({ queryKey: gcKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to remove entity link.'),
  });
};

/* --- Backwards compatibility wrappers --- */

export const useAddVendorLinkMutation = () => {
  const link = useLinkEntityMutation();
  return {
    ...link,
    mutateAsync: (args: { contactId: string; data: { vendorId: string } }) =>
      link.mutateAsync({ contactId: args.contactId, vendorId: args.data.vendorId }),
  };
};

export const useAddGCLinkMutation = () => {
  const link = useLinkEntityMutation();
  return {
    ...link,
    mutateAsync: (args: { contactId: string; data: { generalContractorId: string } }) =>
      link.mutateAsync({
        contactId: args.contactId,
        generalContractorId: args.data.generalContractorId,
      }),
  };
};

/* ---- form hooks ---- */

export const useContactForm = (
  defaults?: Partial<Contact> | Partial<CreateContactInput> | Partial<ContactFormValues>
) => {
  return useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: defaults as Partial<ContactFormValues>,
  });
};
