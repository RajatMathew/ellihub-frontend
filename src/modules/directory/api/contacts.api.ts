import { z } from 'zod';

import api from '@app/api';
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
} from '@modules/directory/schemas/contact.schema';

const BASE = '/contacts';

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
        currentPage: params?.page ?? 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params?.size ?? 25,
      },
    });
  },

  async getById(id: string): Promise<Contact> {
    const res = await api.get(`${BASE}/${id}`);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  // TODO: Full implementation when CRUD UI is built
  async create(data: CreateContactInput): Promise<Contact> {
    const res = await api.post(BASE, data);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  // TODO: Full implementation when CRUD UI is built
  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    const res = await api.put(`${BASE}/${id}`, data);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  // TODO: Replace with dedicated sub-resource endpoints when CRUD UI is built
  async addPhone(id: string, phone: { phone: string; label: string }): Promise<Contact> {
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

  // --- Vendor link sub-resource ---
  async addVendorLink(
    contactId: string,
    data: { vendorId: string; isPrimary?: boolean },
  ): Promise<Contact> {
    const res = await api.post(`${BASE}/${contactId}/vendor-links`, data);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async removeVendorLink(contactId: string, linkId: string): Promise<Contact> {
    const res = await api.delete(`${BASE}/${contactId}/vendor-links/${linkId}`);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  // --- GC link sub-resource ---
  async addGCLink(
    contactId: string,
    data: { generalContractorId: string; isPrimary?: boolean },
  ): Promise<Contact> {
    const res = await api.post(`${BASE}/${contactId}/gc-links`, data);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async removeGCLink(contactId: string, linkId: string): Promise<Contact> {
    const res = await api.delete(`${BASE}/${contactId}/gc-links/${linkId}`);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async getDirectoryKpis(): Promise<DirectoryKpis> {
    const res = await api.get(`${BASE}/directory-kpis`);
    return directoryKpisSchema.parse(res.data?.data ?? res.data);
  },

  async getProfessionalRoles(): Promise<ProfessionalRole[]> {
    const res = await api.get(`${BASE}/professional-roles`);
    return z.array(professionalRoleSchema).parse(res.data?.data ?? res.data ?? []);
  },
};
