import api from '@/app/api';

import {
  contractAttachmentSchema,
  type ContractAttachment,
} from '@/modules/project/schemas/contract-attachment.schema';

const BASE = '/project';

export const contractAttachmentApi = {
  async list(projectId: string): Promise<ContractAttachment[]> {
    const res = await api.get(`${BASE}/prime-contract/${projectId}`);
    const raw = res.data?.data ?? res.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: unknown) => contractAttachmentSchema.parse(item));
  },

  async add(projectId: string, data: { fileId: string }): Promise<void> {
    await api.patch(`${BASE}/prime-contract/add`, {
      projectId,
      fileId: data.fileId,
    });
  },

  async setPrimary(projectId: string, attachmentId: string): Promise<void> {
    await api.patch(`${BASE}/${projectId}/contract/attachments/${attachmentId}/primary`);
  },

  async remove(projectId: string, attachmentId: string): Promise<void> {
    await api.delete(`${BASE}/${projectId}/contract/attachments/${attachmentId}`);
  },
};
