import api from '@/app/api';
import { assertUploadFileIsValid } from '@/modules/files/lib/file-upload-policy';
import {
  fileExportJobSchema,
  fileSchema,
  fileSearchResponseSchema,
  folderDetailSchema,
  type FileExportJob,
  type FileFolderRenameInput,
  type FileItem,
  type FileSearchResponse,
  type FileUploadInput,
  type FolderCreateInput,
  type FolderDetail,
} from '@/modules/files/schemas/file.schema';
import { isAxiosError, type AxiosProgressEvent } from 'axios';
import { z } from 'zod';

const BASE = '/file';
export const FILE_TEXT_PREVIEW_BYTES = 256 * 1024;
const CHUNKED_UPLOAD_THRESHOLD_BYTES = 10 * 1024 * 1024;
const CHUNK_UPLOAD_RETRY_ATTEMPTS = 3;

export type ProjectProtectedFolderType =
  | 'INVOICE'
  | 'RFQ'
  | 'PURCHASE_ORDER'
  | 'SUB_CHANGE_ORDER'
  | 'PRIME_CONTRACT'
  | 'MASTER_SCHEDULE'
  | 'SCHEDULE';

export type ProjectEntityFolderType = 'RFQ' | 'PURCHASE_ORDER' | 'SUB_CHANGE_ORDER' | 'INVOICE';

type DownloadTarget = Pick<FileItem, 'id' | 'name' | 'displayName'>;

const chunkedUploadStartSchema = z.object({
  uploadId: z.string(),
  chunkSize: z.number().int().positive(),
  totalChunks: z.number().int().positive(),
});

type ChunkedUploadStart = z.infer<typeof chunkedUploadStartSchema>;

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

export interface FileUploadOptions {
  signal?: AbortSignal;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
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

type FileReadDisposition = 'inline' | 'attachment';

function buildFileReadUrl(id: string, disposition: FileReadDisposition): string {
  const baseUrl = String(api.defaults.baseURL ?? '').replace(/\/+$/, '');
  const params = new URLSearchParams({ disposition });

  if (disposition === 'attachment') {
    params.set('download', 'true');
  }

  return `${baseUrl}${BASE}/read/${encodeURIComponent(id)}?${params.toString()}`;
}

function parseExportJob(raw: unknown, context: string): FileExportJob {
  const result = fileExportJobSchema.safeParse(raw);

  if (!result.success) {
    console.error(`[${context}] Zod parse error:`, result.error.issues);
    throw result.error;
  }

  return result.data;
}

function parseNullableExportJob(raw: unknown, context: string): FileExportJob | null {
  if (raw == null) return null;

  return parseExportJob(raw, context);
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

function parseUploadedFile(raw: unknown, context: string): FileItem {
  const result = fileSchema.safeParse(raw);

  if (!result.success) {
    console.error(`[${context}] Zod parse error:`, result.error.issues);
    throw result.error;
  }

  return result.data;
}

function parseChunkedUploadStart(raw: unknown): ChunkedUploadStart {
  const result = chunkedUploadStartSchema.safeParse(raw);

  if (!result.success) {
    console.error('[filesApi.startChunkedUpload] Zod parse error:', result.error.issues);
    throw result.error;
  }

  return result.data;
}

function shouldUseChunkedUpload(file: File): boolean {
  return file.size > CHUNKED_UPLOAD_THRESHOLD_BYTES;
}

function getChunkedUploadPayload(file: File, data: FileUploadInput) {
  return {
    ...data,
    fileName: file.name,
    mimeType: data.mimeType || file.type || undefined,
  };
}

function emitUploadProgress(
  onUploadProgress: FileUploadOptions['onUploadProgress'],
  loaded: number,
  total: number
): void {
  onUploadProgress?.({
    loaded,
    total,
    progress: total > 0 ? loaded / total : undefined,
  } as AxiosProgressEvent);
}

function isRetryableUploadError(error: unknown): boolean {
  if (isAxiosError(error)) {
    if (error.code === 'ERR_CANCELED') return false;

    const status = error.response?.status;
    return !status || status === 408 || status === 429 || status >= 500;
  }

  return true;
}

function isChunkedUploadUnsupported(error: unknown): boolean {
  if (!isAxiosError(error)) return false;

  const message = String(error.response?.data?.message ?? error.message ?? '');
  return error.response?.status === 400 && message.includes('Chunked uploads are not supported');
}
function waitForRetry(attempt: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 400 * (attempt + 1)));
}

async function runChunkRequestWithRetry(
  action: () => Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  for (let attempt = 0; attempt < CHUNK_UPLOAD_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await action();
      return;
    } catch (error) {
      if (signal?.aborted || attempt === CHUNK_UPLOAD_RETRY_ATTEMPTS - 1) throw error;
      if (!isRetryableUploadError(error)) throw error;

      await waitForRetry(attempt);
    }
  }
}

async function uploadFileWithFormData(
  file: File,
  data: FileUploadInput,
  options: FileUploadOptions
): Promise<FileItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', data.name);
  formData.append('parentId', data.parentId);
  if (data.mimeType) formData.append('mimeType', data.mimeType);
  formData.append('size', String(data.size));
  formData.append('data', JSON.stringify(data));

  const res = await api.post(`${BASE}/upload`, formData, {
    timeout: 0,
    signal: options.signal,
    onUploadProgress: options.onUploadProgress,
  });

  return parseUploadedFile(res.data?.data ?? res.data, 'filesApi.uploadFile');
}

async function uploadFileInChunks(
  file: File,
  data: FileUploadInput,
  options: FileUploadOptions
): Promise<FileItem> {
  let uploadId: string | undefined;
  let reportedBytes = 0;

  const reportProgress = (loaded: number) => {
    reportedBytes = Math.max(reportedBytes, Math.min(loaded, file.size));
    emitUploadProgress(options.onUploadProgress, reportedBytes, file.size);
  };

  try {
    const startRes = await api.post(
      `${BASE}/upload/chunked/start`,
      getChunkedUploadPayload(file, data),
      {
        timeout: 0,
        signal: options.signal,
      }
    );
    const upload = parseChunkedUploadStart(startRes.data?.data ?? startRes.data);
    uploadId = upload.uploadId;

    const totalChunks = Math.ceil(file.size / upload.chunkSize);
    if (totalChunks !== upload.totalChunks) {
      throw new Error('Upload session chunk count does not match the selected file.');
    }

    reportProgress(0);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const chunkStart = chunkIndex * upload.chunkSize;
      const chunkEnd = Math.min(file.size, chunkStart + upload.chunkSize);
      const chunk = file.slice(chunkStart, chunkEnd);

      await runChunkRequestWithRetry(async () => {
        await api.put(`${BASE}/upload/chunked/${upload.uploadId}/${chunkIndex}`, chunk, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'x-upload-parent-id': data.parentId,
          },
          timeout: 0,
          signal: options.signal,
          onUploadProgress: (event) => {
            reportProgress(chunkStart + Math.min(event.loaded, chunk.size));
          },
        });
      }, options.signal);

      reportProgress(chunkEnd);
    }

    const completeRes = await api.post(
      `${BASE}/upload/chunked/${upload.uploadId}/complete`,
      {
        ...getChunkedUploadPayload(file, data),
        totalChunks,
      },
      {
        timeout: 0,
        signal: options.signal,
      }
    );

    reportProgress(file.size);
    return parseUploadedFile(
      completeRes.data?.data ?? completeRes.data,
      'filesApi.completeChunkedUpload'
    );
  } catch (error) {
    if (uploadId) {
      void api.delete(`${BASE}/upload/chunked/${uploadId}`, { timeout: 0 }).catch(() => undefined);
    }

    throw error;
  }
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

  async uploadFile(
    file: File,
    data: FileUploadInput,
    options: FileUploadOptions = {}
  ): Promise<FileItem> {
    assertUploadFileIsValid(file, data);

    if (shouldUseChunkedUpload(file)) {
      try {
        return await uploadFileInChunks(file, data, options);
      } catch (error) {
        if (!isChunkedUploadUnsupported(error)) throw error;
      }
    }

    return uploadFileWithFormData(file, data, options);
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

  getFileReadUrl(id: string, disposition: FileReadDisposition = 'inline'): string {
    return buildFileReadUrl(id, disposition);
  },

  async getTextPreview(id: string): Promise<string> {
    const res = await api.get<string>(`${BASE}/read/${id}`, {
      headers: { Range: `bytes=0-${FILE_TEXT_PREVIEW_BYTES - 1}` },
      responseType: 'text',
      transformResponse: [(data) => data],
    });

    return typeof res.data === 'string' ? res.data : String(res.data ?? '');
  },

  async downloadFile(file: DownloadTarget): Promise<void> {
    downloadFromUrl(buildFileReadUrl(file.id, 'attachment'), getDownloadName(file, 'download'));
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

  async getActiveFolderExportJob(folderId?: string): Promise<FileExportJob | null> {
    const res = await api.get(`${BASE}/export/active`, {
      params: folderId ? { folderId } : undefined,
    });
    const raw = res.data?.data ?? res.data;

    return parseNullableExportJob(raw, 'filesApi.getActiveFolderExportJob');
  },

  async cancelFolderExportJob(jobId: string): Promise<FileExportJob> {
    const res = await api.post(`${BASE}/export/${jobId}/cancel`);
    const raw = res.data?.data ?? res.data;

    return parseExportJob(raw, 'filesApi.cancelFolderExportJob');
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
