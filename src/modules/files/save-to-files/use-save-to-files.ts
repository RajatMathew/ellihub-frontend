import { useCallback, useMemo, useState } from 'react';

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
import { resolveSaveNames } from '@/modules/files/save-to-files/save-names';
import {
  getSourceDefaultName,
  getSourceFileName,
  getSourceMimeType,
  isServerSideSource,
  resolveSaveSourceFile,
  toSaveSourceList,
  type SaveToFilesInputSource,
} from '@/modules/files/save-to-files/save-source';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import { toast } from 'sonner';

export interface UseSaveToFilesOptions {
  /** One file, or several picked together — see `toSaveSourceList`. */
  source: SaveToFilesInputSource;
  onSaved?: (file: FileItem) => void;
  /** Server-side import via `POST /file/import-url`. */
  enableExternalUrl?: boolean;
  /** Server-side copy/move via `POST /file/:id/copy` and `/move`. */
  enableExistingTransfer?: boolean;
}

export interface SaveToFilesInput {
  parentId: string;
  /**
   * One display name per source, positionally. Every file in a selection is
   * renameable, not just a lone one (elli-ui#1063): attachments arrive named
   * `image003.png` and `Scan_2026_09_18.pdf`, and a bulk save that could only
   * take them as they came meant filing five files and then renaming five
   * files.
   *
   * A blank entry falls back to the source's own default name, so a caller
   * that does not offer renaming can pass `[]`.
   */
  names: string[];
}

/** `queued` hands off to the upload tray; `saved` completed server-side. */
export type SaveToFilesOutcome = 'queued' | 'saved';

export function useSaveToFiles({
  source,
  onSaved,
  enableExternalUrl = true,
  enableExistingTransfer = true,
}: UseSaveToFilesOptions) {
  const sources = useMemo(() => toSaveSourceList(source), [source]);
  const isBulk = sources.length > 1;
  const { enqueueUploads } = useUploadManager();
  const importFromUrl = useImportFileFromUrlMutation();
  const copyFile = useCopyFileMutation();
  const moveFile = useMoveFileMutation();
  const [isPreparing, setIsPreparing] = useState(false);

  const saveServerSide = useCallback(
    async ({ parentId, name }: { parentId: string; name: string }): Promise<FileItem> => {
      const source = sources[0]!;
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
    [copyFile, enableExistingTransfer, enableExternalUrl, importFromUrl, moveFile, sources]
  );

  /**
   * Several files into one folder. Every source is resolved first and handed
   * to the upload manager in **one** `enqueueUploads` call: the tray then shows
   * a single transfer with real progress across the set, and a failure part-way
   * through does not leave the reader guessing which of five files landed.
   *
   * Bulk is blob-only. The server-side kinds (`externalUrl`, `existing`) are
   * single-file affordances in the Files module and nothing offers them in a
   * multi-selection, so the guard is an assertion rather than a branch.
   */
  const saveMany = useCallback(
    async (parentId: string, names: string[]): Promise<SaveToFilesOutcome | null> => {
      if (sources.some(isServerSideSource)) {
        toast.error('These files cannot be saved together.');
        return null;
      }

      const resolvedNames = resolveSaveNames(sources.map(getSourceDefaultName), names);
      const resolved = await Promise.all(
        sources.map(async (item, index) => ({
          item,
          name: resolvedNames[index]!,
          file: await resolveSaveSourceFile(item),
        }))
      );

      for (const { item, name, file } of resolved) {
        const error =
          getUploadFileValidationError(file) ?? getUploadDisplayNameValidationError(name, file);
        if (error) {
          toast.error(`${getSourceFileName(item)}: ${error}`);
          return null;
        }
      }

      enqueueUploads(
        resolved.map(({ item, name, file }) => ({
          file,
          data: {
            name,
            parentId,
            mimeType: getSourceMimeType(item) || file.type || undefined,
            size: file.size,
          },
        })),
        {
          label: `${resolved.length} files`,
          onUploaded: (uploaded) => onSaved?.(uploaded),
        }
      );

      return 'queued';
    },
    [enqueueUploads, onSaved, sources]
  );

  const save = useCallback(
    async ({ parentId, names }: SaveToFilesInput): Promise<SaveToFilesOutcome | null> => {
      setIsPreparing(true);

      try {
        if (isBulk) return await saveMany(parentId, names);

        const source = sources[0]!;
        const trimmedName = resolveSaveNames([getSourceDefaultName(source)], names)[0]!;
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
      isBulk,
      moveFile.isError,
      onSaved,
      saveMany,
      saveServerSide,
      sources,
    ]
  );

  return {
    save,
    isSaving: isPreparing || importFromUrl.isPending || copyFile.isPending || moveFile.isPending,
  };
}
