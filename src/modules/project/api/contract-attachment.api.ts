import api from '@app/api';

import {
  contractAttachmentSchema,
  type ContractAttachment,
} from '@modules/project/schemas/contract-attachment.schema';

const BASE = '/projects';

export const contractAttachmentApi = {
  async list(projectId: string): Promise<ContractAttachment[]> {
    const res = await api.get(`${BASE}/${projectId}/contract/attachments`);
    const raw = res.data?.data ?? res.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: unknown) => contractAttachmentSchema.parse(item));
  },

  async add(
    projectId: string,
    data: { fileId: string },
  ): Promise<ContractAttachment> {
    const res = await api.post(`${BASE}/${projectId}/contract/attachments`, data);
    return contractAttachmentSchema.parse(res.data?.data ?? res.data);
  },

  async remove(projectId: string, attachmentId: string): Promise<void> {
    await api.delete(`${BASE}/${projectId}/contract/attachments/${attachmentId}`);
  },
};
