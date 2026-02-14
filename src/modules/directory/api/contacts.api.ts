import api from '@app/api';
import {
  contactDetailSchema,
  contactPaginatedResponseSchema,
  contactSchema,
  directoryKpisSchema,
  type Contact,
  type ContactDetail,
  type ContactPaginatedResponse,
  type CreateContactInput,
  type DirectoryKpis,
  type ListContactsParams,
  type UpdateContactInput,
} from '@modules/directory/schemas/contact.schema';

const BASE = '/contacts';

export const contactsApi = {
  async list(params?: ListContactsParams): Promise<ContactPaginatedResponse> {
    const query: Record<string, unknown> = {};
    if (params?.page != null) query.page = params.page;
    if (params?.size != null) query.size = params.size;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortOrder) query.sortOrder = params.sortOrder;
    if (params?.search) query.search = params.search;

    const filter: Record<string, string> = {};
    if (params?.jobTitle) filter.jobTitle = params.jobTitle;
    if (params?.vendorId) filter.vendorId = params.vendorId;
    if (params?.generalContractorId) filter.generalContractorId = params.generalContractorId;
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

  async getById(id: string): Promise<ContactDetail> {
    const res = await api.get(`${BASE}/${id}`);
    return contactDetailSchema.parse(res.data?.data ?? res.data);
  },

  async create(data: CreateContactInput): Promise<Contact> {
    const res = await api.post(BASE, data);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async update(id: string, data: UpdateContactInput): Promise<Contact> {
    const res = await api.put(`${BASE}/${id}`, data);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async addPhone(id: string, phone: { phone: string; label: string }): Promise<Contact> {
    const detail = await contactsApi.getById(id);
    return contactsApi.update(id, {
      phoneNumbers: [...detail.phoneNumbers, phone],
    });
  },

  async removePhone(id: string, phoneIndex: number): Promise<Contact> {
    const detail = await contactsApi.getById(id);
    return contactsApi.update(id, {
      phoneNumbers: detail.phoneNumbers.filter((_, i) => i !== phoneIndex),
    });
  },

  async addEmail(id: string, email: { email: string; label: string }): Promise<Contact> {
    const detail = await contactsApi.getById(id);
    return contactsApi.update(id, {
      emails: [...detail.emails, email],
    });
  },

  async removeEmail(id: string, emailIndex: number): Promise<Contact> {
    const detail = await contactsApi.getById(id);
    return contactsApi.update(id, {
      emails: detail.emails.filter((_, i) => i !== emailIndex),
    });
  },

  async linkEntity(
    id: string,
    entity: { vendorId?: string | null; generalContractorId?: string | null },
  ): Promise<Contact> {
    return contactsApi.update(id, entity);
  },

  async unlinkEntity(
    id: string,
    entityType: 'vendor' | 'generalContractor',
  ): Promise<Contact> {
    return contactsApi.update(id, {
      [entityType === 'vendor' ? 'vendorId' : 'generalContractorId']: null,
    });
  },

  // TODO: Backend API yet to implement — PATCH /contacts/:id/deactivate
  async deactivate(id: string): Promise<Contact> {
    const res = await api.patch(`${BASE}/${id}/deactivate`);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  // TODO: Backend API yet to implement — PATCH /contacts/:id/activate
  async activate(id: string): Promise<Contact> {
    const res = await api.patch(`${BASE}/${id}/activate`);
    return contactSchema.parse(res.data?.data ?? res.data);
  },

  async getDirectoryKpis(): Promise<DirectoryKpis> {
    const res = await api.get(`${BASE}/directory-kpis`);
    return directoryKpisSchema.parse(res.data?.data ?? res.data);
  },

  async getProfessionalRoles(): Promise<string[]> {
    const allContacts = await contactsApi.list({ size: 1000 });
    const roles = new Set(allContacts.data.map((c) => c.jobTitle).filter(Boolean));
    return Array.from(roles).sort();
  },
};
