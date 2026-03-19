import api from '@app/api';

import {
  pcoAttachmentSchema,
  type PCOAttachment,
} from '@modules/project/schemas/pco-attachment.schema';

const BASE = '/pcos';

export const pcoAttachmentApi = {
  async list(pcoId: string): Promise<PCOAttachment[]> {
    const res = await api.get(`${BASE}/${pcoId}/attachments`);
    const raw = res.data?.data ?? res.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: unknown) => pcoAttachmentSchema.parse(item));
  },

  async add(pcoId: string, data: { fileId: string }): Promise<PCOAttachment> {
    const res = await api.post(`${BASE}/${pcoId}/attachments`, data);
    return pcoAttachmentSchema.parse(res.data?.data ?? res.data);
  },

  async remove(pcoId: string, attachmentId: string): Promise<void> {
    await api.delete(`${BASE}/${pcoId}/attachments/${attachmentId}`);
  },
};
