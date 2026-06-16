import api from '@/app/api';

import {
  contractAttachmentSchema,
  type ContractAttachment,
} from '@/modules/project/schemas/contract-attachment.schema';
import { fileSchema, type FileItem } from '@/modules/files/schemas/file.schema';

const BASE = '/project';

export const contractAttachmentApi = {
  async list(projectId: string): Promise<ContractAttachment[]> {
    const res = await api.get(`${BASE}/${projectId}/prime-contract/pinned`);
    const raw = res.data?.data ?? res.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: unknown) => contractAttachmentSchema.parse(item));
  },

  async candidates(projectId: string): Promise<FileItem[]> {
    const res = await api.get(`${BASE}/${projectId}/prime-contract/candidates`);
    const raw = res.data?.data ?? res.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: unknown) => fileSchema.parse(item));
  },

  async pin(projectId: string, fileIds: string[]): Promise<void> {
    await api.patch(`${BASE}/${projectId}/prime-contract/pin`, {
      projectId,
      fileIds,
    });
  },

  async unpin(projectId: string, primeContractIds: string[]): Promise<void> {
    await api.patch(`${BASE}/${projectId}/prime-contract/unpin`, {
      projectId,
      primeContractIds,
    });
  },

  async add(projectId: string, data: { fileId: string }): Promise<void> {
    await contractAttachmentApi.pin(projectId, [data.fileId]);
  },

  async setPrimary(
    projectId: string,
    primeContractIds: string[],
    isPrimary: boolean
  ): Promise<void> {
    await api.patch(`${BASE}/${projectId}/prime-contract/primary`, {
      projectId,
      primeContractIds,
      isPrimary,
    });
  },

  async remove(projectId: string, attachmentId: string): Promise<void> {
    await contractAttachmentApi.unpin(projectId, [attachmentId]);
  },
};
