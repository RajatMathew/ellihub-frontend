import api from '@/app/api';
import {
  fileSchema,
  folderDetailSchema,
  type FileFolderRenameInput,
  type FileItem,
  type FileUploadInput,
  type FolderCreateInput,
  type FolderDetail,
} from '@/modules/files/schemas/file.schema';

const BASE = '/file';

export type ProjectProtectedFolderType =
  | 'INVOICE'
  | 'RFQ'
  | 'PURCHASE_ORDER'
  | 'PURCHASE_ORDER_CO'
  | 'PRIME_CO'
  | 'PRIME_CONTRACT'
  | 'SCHEDULE';

function parseFolderId(raw: unknown, context: string): string {
  if (typeof raw !== 'string' || !raw) {
    throw new Error(`${context} returned an invalid folder id`);
  }

  return raw;
}

export const filesApi = {
  async getRootFolder(): Promise<FileItem> {
    const res = await api.get(`${BASE}/root`);
    const raw = res.data?.data ?? res.data;
    const result = fileSchema.safeParse(raw);

    if (!result.success) {
      console.error('[filesApi.getRootFolder] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },

  async getFolderDetails(id: string): Promise<FolderDetail> {
    const res = await api.get(`${BASE}/folder/${id}`);
    const raw = res.data?.data ?? res.data;
    const result = folderDetailSchema.safeParse(raw);

    if (!result.success) {
      console.error('[filesApi.getFolderDetails] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },

  async getProjectFolderId(projectId: string): Promise<string> {
    const res = await api.get(`${BASE}/project/${projectId}/folder`);
    const raw = res.data?.data ?? res.data;

    return parseFolderId(raw, 'Project folder lookup');
  },

  async getProjectSubFolderId(
    projectId: string,
    type: ProjectProtectedFolderType
  ): Promise<string> {
    const res = await api.get(`${BASE}/project/${projectId}/folder/${type}`);
    const raw = res.data?.data ?? res.data;

    return parseFolderId(raw, 'Project subfolder lookup');
  },

  async createFolder(data: FolderCreateInput): Promise<FileItem> {
    const res = await api.post(`${BASE}/folder`, data);
    const raw = res.data?.data ?? res.data;
    const result = fileSchema.safeParse(raw);

    if (!result.success) {
      console.error('[filesApi.createFolder] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },

  async uploadFile(file: File, data: FileUploadInput): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    formData.append('parentId', data.parentId);
    if (data.mimeType) formData.append('mimeType', data.mimeType);
    formData.append('size', String(data.size));
    formData.append('data', JSON.stringify(data));

    await api.post(`${BASE}/upload`, formData);

    // Backend returns an empty body, so query the parent folder to find the upload.
    const folder = await this.getFolderDetails(data.parentId);
    const match = folder.children
      .filter((child) => child.name === data.name && child.type === 'FILE')
      .sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )[0];

    if (!match) {
      throw new Error('Upload succeeded but file not found in folder');
    }

    return match;
  },

  async getDownloadLink(id: string): Promise<string> {
    const res = await api.get(`${BASE}/download/${id}`);
    return res.data?.data ?? res.data;
  },

  async rename(data: FileFolderRenameInput): Promise<FileItem> {
    const res = await api.put(`${BASE}/rename`, data);
    const raw = res.data?.data ?? res.data;
    const result = fileSchema.safeParse(raw);

    if (!result.success) {
      console.error('[filesApi.rename] Zod parse error:', result.error.issues);
      throw result.error;
    }

    return result.data;
  },

  async deleteFolder(id: string): Promise<void> {
    await api.delete(`${BASE}/folder/${id}`);
  },

  async deleteFile(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
