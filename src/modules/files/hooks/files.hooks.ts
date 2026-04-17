import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { filesApi } from '@modules/files/api/files.api';
import { filesKeys } from '@modules/files/constants/files.keys';
import type {
  FileFolderRenameInput,
  FileUploadInput,
  FolderCreateInput,
} from '@modules/files/schemas/file.schema';

/* ---- queries ---- */

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
    queryFn: () => filesApi.getDownloadLink(fileId!),
    enabled: enabled && !!fileId,
    staleTime: 5 * 60 * 1000,
  });

export const useTextContentQuery = (url: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: ['textContent', url],
    queryFn: async () => {
      const res = await fetch(url!);
      const text = await res.text();
      return text.slice(0, 50000);
    },
    enabled: enabled && !!url,
    staleTime: 5 * 60 * 1000,
  });

/* ---- mutations ---- */

export const useCreateFolderMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FolderCreateInput) => filesApi.createFolder(data),
    onSuccess: (_, { parentId }) => {
      qc.invalidateQueries({ queryKey: filesKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.folderDetail(parentId) });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create folder.';
      toast.error(msg);
    },
  });
};

export const useUploadFileMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, data }: { file: File; data: FileUploadInput }) =>
      filesApi.uploadFile(file, data),
    onSuccess: (_, { data: { parentId } }) => {
      qc.invalidateQueries({ queryKey: filesKeys.all });
      qc.invalidateQueries({ queryKey: filesKeys.folderDetail(parentId) });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to upload file.';
      toast.error(msg);
    },
  });
};

export const useRenameMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FileFolderRenameInput) => filesApi.rename(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to rename.';
      toast.error(msg);
    },
  });
};

export const useDeleteFolderMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesApi.deleteFolder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete folder.';
      toast.error(msg);
    },
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
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = file.displayName || file.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error('Blob download failed, falling back to window.open', err);
        window.open(url, '_blank');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to download file.';
      toast.error(msg);
    },
  });
};

export const useDeleteFileMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => filesApi.deleteFile(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: filesKeys.all });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete file.';
      toast.error(msg);
    },
  });
};
