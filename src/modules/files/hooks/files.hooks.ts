import { toastApiError } from '@/app/lib/toast-api-error';
import { filesApi } from '@/modules/files/api/files.api';
import { filesKeys } from '@/modules/files/constants/files.keys';
import type {
  FileFolderRenameInput,
  FileUploadInput,
  FolderCreateInput,
} from '@/modules/files/schemas/file.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const PREVIEW_STALE_TIME = 5 * 60 * 1000;

export const useRootFolderQuery = () =>
  useQuery({
    queryKey: filesKeys.root(),
    queryFn: () => filesApi.getRootFolder(),
  });

export const useFolderDetailQuery = (id: string) =>
  useQuery({
    queryKey: filesKeys.folderDetail(id),
    queryFn: () => filesApi.getFolderDetails(id),
    enabled: !!id,
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
      const text = await res.text();
      return text.slice(0, 50000);
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
    mutationFn: ({ file, data }: { file: File; data: FileUploadInput }) =>
      filesApi.uploadFile(file, data),
    onSuccess: (_, { data: { parentId } }) => {
      queryClient.invalidateQueries({ queryKey: filesKeys.all });
      queryClient.invalidateQueries({ queryKey: filesKeys.folderDetail(parentId) });
    },
    onError: (error) => toastApiError(error, 'Failed to upload file.'),
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
    mutationFn: async (file: { id: string; name?: string | null; displayName?: string | null }) => {
      const url = await filesApi.getDownloadLink(file.id);

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = blobUrl;
        anchor.download = file.displayName || file.name || 'download';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Blob download failed, falling back to window.open', error);
        window.open(url, '_blank');
      }
    },
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
