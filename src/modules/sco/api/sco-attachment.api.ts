import api from '@app/api';

const BASE = '/sco';

export const scoAttachmentApi = {
  async add(scoId: string, data: { fileId: string }) {
    const res = await api.post(`${BASE}/${scoId}/attachments`, data);
    return res.data?.data ?? res.data;
  },

  async remove(scoId: string, attachmentId: string): Promise<void> {
    await api.delete(`${BASE}/${scoId}/attachments/${attachmentId}`);
  },
};
