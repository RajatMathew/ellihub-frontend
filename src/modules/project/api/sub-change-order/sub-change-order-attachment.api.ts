import api from '@/app/api';

const BASE = '/sub-change-order/attachment';

export const scoAttachmentApi = {
  async add(scoId: string, data: { documentId: string }) {
    const res = await api.patch(`${BASE}/add`, { scoId, documentId: data.documentId });
    return res.data?.data ?? res.data;
  },

  async remove(_scoId: string, attachmentId: string): Promise<void> {
    await api.patch(`${BASE}/remove`, { id: attachmentId });
  },
};
