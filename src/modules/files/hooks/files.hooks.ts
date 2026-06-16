import { toastApiError } from '@/app/lib/toast-api-error';
import {
  filesApi,
  type FileSearchParams,
  type FileUploadBatchInput,
  type FileUploadPayload,
} from '@/modules/files/api/files.api';
import { filesKeys } from '@/modules/files/constants/files.keys';
import type { FileFolderRenameInput, FolderCreateInput } from '@/modules/files/schemas/file.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const PREVIEW_STALE_TIME = 5 * 60 * 1000;
export const useRootFolderQuery = (enabled = true) =>
  useQuery({
    queryKey: filesKeys.root(),
    queryFn: () => filesApi.getRootFolder(),
    enabled,
    refetchOnMount: 'always',
  });

export const useFolderDetailQuery = (id: string | undefined, enabled = true) =>
  useQuery({
    queryKey: filesKeys.folderDetail(id ?? ''),
    queryFn: () => {
      if (!id) throw new Error('Missing folder id');

      return filesApi.getFolderDetails(id);
    },
    enabled: enabled && !!id,
    refetchOnMount: 'always',
  });

export const useFilesSearchQuery = (params: FileSearchParams, enabled: boolean) =>
  useQuery({
    queryKey: filesKeys.search(params),
    queryFn: () => filesApi.searchFiles(params),
    enabled,
  });

export const useFilePreviewQuery = (fileId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: filesKeys.preview(fileId ?? ''),
    queryFn: () => {
      if (!fileId) throw new Error('Missing file id');

      return filesApi.getDownloadLink(fileId);
    },
    enabled: enabled && !!fileId,
    staleTime: PREVIEW_STALE_TIME,
  });

export const useTextContentQuery = (url: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['textContent', url],
    queryFn: async () => {
      if (!url) throw new Error('Missing preview URL');

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load text preview');

      const text = await res.text();
      return text.slice(0, 100000);
    },
    enabled: enabled && !!url,
    staleTime: PREVIEW_STALE_TIME,
  });

export const useCreateFolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FolderCreateInput) => filesApi.createFolder(data),
    onSuccess: (_, { parentId }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
      queryClient.invalidateQueries({ queryKey: filesKeys.folderDetail(parentId) });
    },
    onError: (error) => toastApiError(error, 'Failed to create folder.'),
  });
};

export const useUploadFileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, data }: FileUploadPayload) => filesApi.uploadFile(file, data),
    onSuccess: (_, { data: { parentId } }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
      queryClient.invalidateQueries({ queryKey: filesKeys.folderDetail(parentId) });
    },
    onError: (error) => toastApiError(error, 'Failed to upload file.'),
  });
};

export const useUploadFilesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payloads, onProgress }: FileUploadBatchInput) =>
      filesApi.uploadFiles(payloads, onProgress),
    onSuccess: (_, { payloads }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });

      const parentIds = new Set(payloads.map(({ data }) => data.parentId));

      for (const parentId of parentIds) {
        queryClient.invalidateQueries({ queryKey: filesKeys.folderDetail(parentId) });
      }
    },
    onError: (error) => toastApiError(error, 'Failed to upload files.'),
  });
};

export const useRenameMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FileFolderRenameInput) => filesApi.rename(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to rename.'),
  });
};

export const useDeleteFolderMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => filesApi.deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to delete folder.'),
  });
};

export const useDownloadFile = () => {
  return useMutation({
    mutationFn: (file: { id: string; name?: string | null; displayName?: string | null }) =>
      filesApi.downloadFile(file),
    onError: (error) => toastApiError(error, 'Failed to download file.'),
  });
};

export const useDeleteFileMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => filesApi.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (error) => toastApiError(error, 'Failed to delete file.'),
  });
};
