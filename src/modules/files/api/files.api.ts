import api from '@app/api';
import {
  fileSchema,
  folderDetailSchema,
  type FileItem,
  type FileUploadInput,
  type FileFolderRenameInput,
  type FolderCreateInput,
  type FolderDetail,
} from '@modules/files/schemas/file.schema';

const BASE = '/file';

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
    formData.append('data', JSON.stringify(data));

    await api.post(`${BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Backend returns empty string — find the uploaded file by querying the parent folder
    const folder = await this.getFolderDetails(data.parentId);
    const match = folder.children
      .filter((c) => c.name === data.name && c.type === 'FILE')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

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
    await api.delete(`${BASE}/file/${id}`);
  },
};
