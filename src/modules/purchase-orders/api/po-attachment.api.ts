import api from '@app/api';

const BASE = '/po';

export const poAttachmentApi = {
  async add(poId: string, data: { fileId: string }) {
    const res = await api.post(`${BASE}/${poId}/attachments`, data);
    return res.data?.data ?? res.data;
  },

  async remove(poId: string, attachmentId: string): Promise<void> {
    await api.delete(`${BASE}/${poId}/attachments/${attachmentId}`);
  },
};
