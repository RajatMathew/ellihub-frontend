import { useCallback, useState } from 'react';

import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import {
  useCopyFileMutation,
  useImportFileFromUrlMutation,
  useMoveFileMutation,
} from '@/modules/files/hooks/files.hooks';
import {
  getUploadDisplayNameValidationError,
  getUploadFileValidationError,
  getUploadNameError,
} from '@/modules/files/lib/file-upload-policy';
import {
  getSourceFileName,
  getSourceMimeType,
  isServerSideSource,
  resolveSaveSourceFile,
  type SaveToFilesSource,
} from '@/modules/files/save-to-files/save-source';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import { toast } from 'sonner';

export interface UseSaveToFilesOptions {
  source: SaveToFilesSource;
  onSaved?: (file: FileItem) => void;
  /** Server-side import via `POST /file/import-url`. */
  enableExternalUrl?: boolean;
  /** Server-side copy/move via `POST /file/:id/copy` and `/move`. */
  enableExistingTransfer?: boolean;
}

export interface SaveToFilesInput {
  parentId: string;
  name: string;
}

/** `queued` hands off to the upload tray; `saved` completed server-side. */
export type SaveToFilesOutcome = 'queued' | 'saved';

export function useSaveToFiles({
  source,
  onSaved,
  enableExternalUrl = true,
  enableExistingTransfer = true,
}: UseSaveToFilesOptions) {
  const { enqueueUploads } = useUploadManager();
  const importFromUrl = useImportFileFromUrlMutation();
  const copyFile = useCopyFileMutation();
  const moveFile = useMoveFileMutation();
  const [isPreparing, setIsPreparing] = useState(false);

  const saveServerSide = useCallback(
    async ({ parentId, name }: SaveToFilesInput): Promise<FileItem> => {
      if (source.kind === 'externalUrl') {
        if (!enableExternalUrl) {
          throw new Error('Saving from an external link is not available yet.');
        }

        return importFromUrl.mutateAsync({
          url: source.url,
          parentId,
          name,
          mimeType: source.mimeType,
        });
      }

      if (source.kind !== 'existing') throw new Error('Unsupported source.');
      if (!enableExistingTransfer) {
        throw new Error('Copying an existing file is not available yet.');
      }

      const transfer = source.mode === 'move' ? moveFile : copyFile;

      return transfer.mutateAsync({ id: source.fileId, parentId, name });
    },
    [copyFile, enableExistingTransfer, enableExternalUrl, importFromUrl, moveFile, source]
  );

  const save = useCallback(
    async ({ parentId, name }: SaveToFilesInput): Promise<SaveToFilesOutcome | null> => {
      const trimmedName = name.trim();
      setIsPreparing(true);

      try {
        if (isServerSideSource(source)) {
          const nameError = getUploadNameError(trimmedName);
          if (nameError) {
            toast.error(nameError);
            return null;
          }

          const file = await saveServerSide({ parentId, name: trimmedName });
          onSaved?.(file);

          return 'saved';
        }

        const file = await resolveSaveSourceFile(source);
        const fileError = getUploadFileValidationError(file);
        const nameError = getUploadDisplayNameValidationError(trimmedName, file);

        if (fileError || nameError) {
          toast.error(fileError ?? nameError ?? 'This file cannot be saved.');
          return null;
        }

        enqueueUploads(
          [
            {
              file,
              data: {
                name: trimmedName,
                parentId,
                mimeType: getSourceMimeType(source) || file.type || undefined,
                size: file.size,
              },
            },
          ],
          { label: getSourceFileName(source), onUploaded: (uploaded) => onSaved?.(uploaded) }
        );

        return 'queued';
      } catch (error) {
        // Mutation hooks toast their own API errors; this covers resolve failures.
        if (!importFromUrl.isError && !copyFile.isError && !moveFile.isError) {
          toast.error(getApiErrorMessage(error, 'Failed to save the file.'));
        }

        return null;
      } finally {
        setIsPreparing(false);
      }
    },
    [
      copyFile.isError,
      enqueueUploads,
      importFromUrl.isError,
      moveFile.isError,
      onSaved,
      saveServerSide,
      source,
    ]
  );

  return {
    save,
    isSaving: isPreparing || importFromUrl.isPending || copyFile.isPending || moveFile.isPending,
  };
}
