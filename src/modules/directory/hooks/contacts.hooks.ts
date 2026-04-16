import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { contactsApi } from '@modules/directory/api/contacts.api';
import { contactsKeys } from '@modules/directory/constants/contacts.keys';
import {
  contactFormSchema,
  type Contact,
  type ContactPhone,
  type ContactEmail,
  type ContactFormValues,
  type CreateContactInput,
  type UpdateContactInput,
  type ListContactsParams,
} from '@modules/directory/schemas/contact.schema';

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
    },
    onError: () => toast.error('Failed to create contact.'),
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
    },
    onError: () => toast.error('Failed to update contact.'),
  });
};

export const useDeleteContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: contactsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
    },
    onError: () => toast.error('Failed to delete contact.'),
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
    onError: () => toast.error('Failed to add phone number.'),
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
    onError: () => toast.error('Failed to remove phone number.'),
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
    onError: () => toast.error('Failed to add email.'),
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
    onError: () => toast.error('Failed to remove email.'),
  });
};

/* ---- vendor link mutations ---- */

export const useAddVendorLinkMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      data,
    }: {
      contactId: string;
      data: { vendorId: string; isPrimary?: boolean };
    }) => contactsApi.addVendorLink(contactId, data),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
    },
    onError: () => toast.error('Failed to add vendor link.'),
  });
};

export const useRemoveVendorLinkMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, vendorId }: { contactId: string; vendorId: string }) =>
      contactsApi.removeVendorLink(contactId, vendorId),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
    },
    onError: () => toast.error('Failed to remove vendor link.'),
  });
};

/* ---- GC link mutations ---- */

export const useAddGCLinkMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      data,
    }: {
      contactId: string;
      data: { generalContractorId: string; isPrimary?: boolean };
    }) => contactsApi.addGCLink(contactId, data),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
    },
    onError: () => toast.error('Failed to add GC link.'),
  });
};

export const useRemoveGCLinkMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contactId,
      generalContractorId,
    }: {
      contactId: string;
      generalContractorId: string;
    }) => contactsApi.removeGCLink(contactId, generalContractorId),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(contactId) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
    },
    onError: () => toast.error('Failed to remove GC link.'),
  });
};

/* ---- form hooks ---- */

export const useContactForm = (
  defaults?: Partial<Contact> | Partial<CreateContactInput> | Partial<ContactFormValues>,
) => {
  return useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: defaults as Partial<ContactFormValues>,
  });
};
