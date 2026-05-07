import api from '@/app/api';
import {
  fileExportJobSchema,
  fileSearchResponseSchema,
  fileSchema,
  folderDetailSchema,
  type FileExportJob,
  type FileFolderRenameInput,
  type FileItem,
  type FileSearchResponse,
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

type DownloadTarget = Pick<FileItem, 'id' | 'name' | 'displayName'>;

export interface FileSearchParams {
  page: number;
  size: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  parentId?: string;
  ancestorId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface FileUploadPayload {
  file: File;
  data: FileUploadInput;
}

export interface FileUploadProgress {
  completed: number;
  total: number;
  currentFileName?: string;
}

export interface FileUploadBatchInput {
  payloads: FileUploadPayload[];
  onProgress?: (progress: FileUploadProgress) => void;
}

function parseFolderId(raw: unknown, context: string): string {
  if (typeof raw !== 'string' || !raw) {
    throw new Error(`${context} returned an invalid folder id`);
  }

  return raw;
}

function getDownloadName(item: DownloadTarget, fallback: string): string {
  return item.displayName || item.name || fallback;
}

function downloadBlob(blob: Blob, fileName: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}

function parseExportJob(raw: unknown, context: string): FileExportJob {
  const result = fileExportJobSchema.safeParse(raw);

  if (!result.success) {
    console.error(`[${context}] Zod parse error:`, result.error.issues);
    throw result.error;
  }

  return result.data;
}

function downloadFromUrl(url: string, fileName: string): void {
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
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

  async searchFiles(params: FileSearchParams): Promise<FileSearchResponse> {
    const query: Record<string, string | number> = {
      page: params.page,
      size: params.size,
      search: params.search,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    };

    if (params.parentId) query.parentId = params.parentId;
    if (params.ancestorId) query.ancestorId = params.ancestorId;
    if (params.createdFrom) query.createdFrom = params.createdFrom;
    if (params.createdTo) query.createdTo = params.createdTo;

    const res = await api.get(`${BASE}/search`, { params: query });
    const raw = {
      data: res.data?.data ?? res.data ?? [],
      pagination: res.data?.pagination ?? {
        currentPage: params.page,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        totalItems: Array.isArray(res.data?.data) ? res.data.data.length : 0,
        itemsPerPage: params.size,
      },
    };
    const result = fileSearchResponseSchema.safeParse(raw);

    if (!result.success) {
      console.error('[filesApi.searchFiles] Zod parse error:', result.error.issues);
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

  async uploadFiles(
    payloads: FileUploadPayload[],
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileItem[]> {
    const uploadedFiles: FileItem[] = [];
    const total = payloads.length;

    for (const [index, payload] of payloads.entries()) {
      onProgress?.({
        completed: index,
        total,
        currentFileName: payload.file.name,
      });
      uploadedFiles.push(await this.uploadFile(payload.file, payload.data));
      onProgress?.({
        completed: index + 1,
        total,
        currentFileName: payload.file.name,
      });
    }

    return uploadedFiles;
  },

  async getDownloadLink(id: string): Promise<string> {
    const res = await api.get(`${BASE}/download/${id}`);
    return res.data?.data ?? res.data;
  },

  async downloadFile(file: DownloadTarget): Promise<void> {
    const res = await api.get<Blob>(`${BASE}/read/${file.id}`, {
      params: { disposition: 'attachment' },
      responseType: 'blob',
      timeout: 0,
    });

    downloadBlob(res.data, getDownloadName(file, 'download'));
  },

  async startFolderExport(folder: DownloadTarget): Promise<FileExportJob> {
    const res = await api.post(`${BASE}/folder/${folder.id}/export`);
    const raw = res.data?.data ?? res.data;

    return parseExportJob(raw, 'filesApi.startFolderExport');
  },

  async getFolderExportJob(jobId: string): Promise<FileExportJob> {
    const res = await api.get(`${BASE}/export/${jobId}`);
    const raw = res.data?.data ?? res.data;

    return parseExportJob(raw, 'filesApi.getFolderExportJob');
  },

  downloadExportJob(job: FileExportJob): void {
    if (!job.downloadUrl) throw new Error('Export is not ready yet.');

    downloadFromUrl(job.downloadUrl, job.fileName);
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
