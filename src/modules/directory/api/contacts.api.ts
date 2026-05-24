import { z } from 'zod';

import api from '@/app/api';
import {
  contactPaginatedResponseSchema,
  contactSchema,
  directoryKpisSchema,
  professionalRoleSchema,
  type Contact,
  type ContactPaginatedResponse,
  type CreateContactInput,
  type DirectoryKpis,
  type ListContactsParams,
  type ProfessionalRole,
  type UpdateContactInput,
} from '@/modules/directory/schemas/contact.schema';

const BASE = '/contact';

export const contactsApi = {
  async list(params?: ListContactsParams): Promise<ContactPaginatedResponse> {
    const query: Record<string, string | number> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;

    const filter: Record<string, string> = {};
    if (params?.professionalRoleId) filter.professionalRoleId = params.professionalRoleId;
    if (params?.vendorId) filter.vendorId = params.vendorId;
    if (params?.generalContractorId)
      filter.generalContractorId = params.generalContractorId;
    if (Object.keys(filter).length > 0) query.filter = JSON.stringify(filter);

    const res = await api.get(BASE, { params: query });
    return contactPaginatedResponseSchema.parse({
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: (res.data?.data ?? res.data ?? []).length,
        itemsPerPage: (res.data?.data ?? res.data ?? []).length || 10,
      },
    });
  },

  async getById(id: string): Promise<Contact> {
    const res = await api.get(`${BASE}/${id}`);
    try {
      return contactSchema.parse(res.data?.data ?? res.data);
    } catch (error) {
      console.error('Contact Detail Schema Validation Error:', error);
      throw error;
    }
  },

  // TODO: Full implementation when CRUD UI is built
  async create(data: CreateContactInput): Promise<Contact> {
    const res = await api.post(BASE, data);
    const parsed = contactSchema.safeParse(res.data?.data ?? res.data);
    if (!parsed.success) {
      console.warn('Contact Create Partial Validation Failure:', parsed.error);
      return (res.data?.data ?? res.data) as Contact;
    }
    return parsed.data;
  },

  // TODO: Full implementation when CRUD UI is built
  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    const res = await api.put(BASE, { ...data, id });
    const parsed = contactSchema.safeParse(res.data?.data ?? res.data);
    if (!parsed.success) {
      console.warn('Contact Update Partial Validation Failure:', parsed.error);
      return (res.data?.data ?? res.data) as Contact;
    }
    return parsed.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async addTag(contactId: string, tag: string): Promise<Contact> {
    const res = await api.patch(`${BASE}/tag/add`, { contactId, tag });
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async removeTag(contactId: string, tag: string): Promise<Contact> {
    const res = await api.patch(`${BASE}/tag/remove`, { contactId, tag });
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  // TODO: Replace with dedicated sub-resource endpoints when CRUD UI is built
  async addPhone(id: string, phone: { number: string; label: string }): Promise<Contact> {
    const res = await api.post(`${BASE}/${id}/phones`, phone);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async removePhone(id: string): Promise<Contact> {
    const res = await api.delete(`${BASE}/${id}/phones`);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async addEmail(id: string, email: { email: string; label: string }): Promise<Contact> {
    const res = await api.post(`${BASE}/${id}/emails`, email);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async removeEmail(id: string): Promise<Contact> {
    const res = await api.delete(`${BASE}/${id}/emails`);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  // --- Link association (Vendor or GC) ---
  async linkEntity(data: {
    contactId: string;
    vendorId?: string | null;
    generalContractorId?: string | null;
    isPrimary?: boolean;
    replaceExisting?: boolean;
  }): Promise<unknown> {
    const res = await api.patch(`${BASE}/link`, data);
    return res.data?.data ?? res.data;
  },

  async unlinkEntity(contactId: string): Promise<unknown> {
    const res = await api.patch(`${BASE}/unlink`, { contactId });
    return res.data?.data ?? res.data;
  },

  async getDirectoryKpis(): Promise<DirectoryKpis> {
    const res = await api.get(`${BASE}/stats`);
    return directoryKpisSchema.parse(res.data?.data ?? res.data);
  },

  async getProfessionalRoles(): Promise<ProfessionalRole[]> {
    const res = await api.get('/lookup/type/PROFESSIONAL_ROLE');
    const raw = res.data?.data ?? res.data ?? [];
    const result = z.array(professionalRoleSchema).safeParse(raw);
    if (!result.success) {
      console.error('[contactsApi.getProfessionalRoles] Zod parse error:', result.error.issues);
      // Return raw data if it looks like an array, to avoid breaking the UI
      return (Array.isArray(raw) ? raw : []) as ProfessionalRole[];
    }
    return result.data;
  },
};
