import api from '@app/api';

const BASE = '/invoices';

export const invoiceAttachmentApi = {
  async add(invoiceId: string, data: { fileId: string }) {
    const res = await api.post(`${BASE}/${invoiceId}/attachments`, data);
    return res.data?.data ?? res.data;
  },

  async remove(invoiceId: string, attachmentId: string): Promise<void> {
    await api.delete(`${BASE}/${invoiceId}/attachments/${attachmentId}`);
  },
};
