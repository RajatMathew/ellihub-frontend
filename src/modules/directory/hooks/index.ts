import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { contactsApi } from '@modules/directory/api/contacts.api';
import { contactsKeys } from '@modules/directory/constants/contacts.keys';
import {
  createContactInputSchema,
  contactSchema,
  type Contact,
  type ContactPhone,
  type ContactEmail,
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

/* ---- activate / deactivate ---- */

export const useDeactivateContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.deactivate(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
    onError: () => toast.error('Failed to deactivate contact.'),
  });
};

export const useActivateContactMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactsApi.activate(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
    onError: () => toast.error('Failed to activate contact.'),
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
    mutationFn: ({ id, phoneIndex }: { id: string; phoneIndex: number }) =>
      contactsApi.removePhone(id, phoneIndex),
    onSuccess: (_, { id }) => {
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
    mutationFn: ({ id, emailIndex }: { id: string; emailIndex: number }) =>
      contactsApi.removeEmail(id, emailIndex),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
    },
    onError: () => toast.error('Failed to remove email.'),
  });
};

/* ---- entity link mutations ---- */

export const useLinkEntityMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      entity,
    }: {
      id: string;
      entity: { vendorId?: string | null; generalContractorId?: string | null };
    }) => contactsApi.linkEntity(id, entity),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
    },
    onError: () => toast.error('Failed to link entity.'),
  });
};

export const useUnlinkEntityMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      entityType,
    }: {
      id: string;
      entityType: 'vendor' | 'generalContractor';
    }) => contactsApi.unlinkEntity(id, entityType),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: contactsKeys.all });
      qc.invalidateQueries({ queryKey: contactsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: contactsKeys.kpis() });
    },
    onError: () => toast.error('Failed to unlink entity.'),
  });
};

/* ---- form hooks ---- */

export const useContactForm = (defaults?: Partial<Contact> | Partial<CreateContactInput>) =>
  useForm<CreateContactInput | Contact>({
    resolver: zodResolver(
      defaults && 'id' in defaults && defaults.id != null
        ? contactSchema
        : createContactInputSchema,
    ),
    defaultValues: defaults as Partial<CreateContactInput & Contact>,
  });
