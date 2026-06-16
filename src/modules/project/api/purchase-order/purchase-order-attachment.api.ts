import api from '@/app/api';

const BASE = '/purchase-order/attachment';

export const poAttachmentApi = {
  async add(purchaseOrderId: string, data: { documentId: string }) {
    const res = await api.patch(`${BASE}/add`, { purchaseOrderId, documentId: data.documentId });
    return res.data?.data ?? res.data;
  },

  async remove(_purchaseOrderId: string, attachmentId: string): Promise<void> {
    await api.patch(`${BASE}/remove`, { id: attachmentId });
  },
};
