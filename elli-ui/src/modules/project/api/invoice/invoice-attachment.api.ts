import api from '@/app/api';

const BASE = '/invoice';

export const invoiceAttachmentApi = {
  async add(invoiceId: string, data: { documentId: string }) {
    const res = await api.patch(`${BASE}/attachment/add`, {
      invoiceId,
      documentId: data.documentId,
    });
    return res.data?.data ?? res.data;
  },

  async remove(_invoiceId: string, attachmentId: string): Promise<void> {
    await api.patch(`${BASE}/attachment/remove`, { id: attachmentId });
  },
};
