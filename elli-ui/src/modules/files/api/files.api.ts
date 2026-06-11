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
import { assertUploadFileIsValid } from '@/modules/files/lib/file-upload-policy';
import { isAxiosError } from 'axios';

const BASE = '/file';
const FILE_UNAVAILABLE_MESSAGE = 'This file no longer exists or has been deleted.';

export type ProjectProtectedFolderType =
  | 'INVOICE'
  | 'RFQ'
  | 'PURCHASE_ORDER'
  | 'PURCHASE_ORDER_CO'
  | 'PRIME_CO'
  | 'SUB_CHANGE_ORDER'
  | 'PRIME_CONTRACT'
  | 'SCHEDULE';

export type ProjectEntityFolderType = 'RFQ' | 'PURCHASE_ORDER' | 'SUB_CHANGE_ORDER' | 'INVOICE';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getMessageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === 'string') return payload;
  if (!isRecord(payload)) return undefined;

  const message = payload.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
    return message.join('\n');
  }

  return undefined;
}

async function getBlobErrorMessage(blob: Blob): Promise<string | undefined> {
  const text = await blob.text();
  if (!text.trim()) return undefined;

  try {
    return getMessageFromPayload(JSON.parse(text) as unknown) ?? text;
  } catch {
    return text;
  }
}

function isUnavailableFileMessage(message: string | undefined): boolean {
  const normalized = message?.toLowerCase() ?? '';

  return (
    normalized.includes('no file found') ||
    normalized.includes('deleted') ||
    normalized.includes('no longer exists')
  );
}

async function normalizeDownloadError(error: unknown): Promise<unknown> {
  if (!isAxiosError(error)) return error;

  const data = error.response?.data;
  const status = error.response?.status;
  const message =
    data instanceof Blob ? await getBlobErrorMessage(data) : getMessageFromPayload(data);

  if ((status === 400 || status === 404) && isUnavailableFileMessage(message)) {
    return new Error(FILE_UNAVAILABLE_MESSAGE);
  }

  if (message) return new Error(message);

  return error;
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

  async getProjectEntityFolderId(
    projectId: string,
    entityType: ProjectEntityFolderType,
    entityId: string
  ): Promise<string> {
    const res = await api.post(`${BASE}/project/${projectId}/entity-folder`, {
      entityType,
      entityId,
    });
    const raw = res.data?.data ?? res.data;

    return parseFolderId(raw, 'Project entity folder lookup');
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
    assertUploadFileIsValid(file, data);

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
    try {
      const res = await api.get<Blob>(`${BASE}/read/${file.id}`, {
        params: { disposition: 'attachment' },
        responseType: 'blob',
        timeout: 0,
      });

      downloadBlob(res.data, getDownloadName(file, 'download'));
    } catch (error: unknown) {
      throw await normalizeDownloadError(error);
    }
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
