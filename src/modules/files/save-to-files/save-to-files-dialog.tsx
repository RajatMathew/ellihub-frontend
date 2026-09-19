/* eslint-disable react-hooks/set-state-in-effect -- resetting the name field when the dialog opens is dialog lifecycle, not external synchronization */

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/app/components/ui/responsive-dialog';
import { cn } from '@/app/lib/utils';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import { getUploadNameError } from '@/modules/files/lib/file-upload-policy';
import { FolderPickerPanel } from '@/modules/files/save-to-files/folder-picker-panel';
import {
  getSourceDefaultName,
  getSourceExtension,
  getSourceFileName,
  getSourceMimeType,
  getSourceSizeBytes,
  toSaveSourceList,
  type SaveToFilesInputSource,
} from '@/modules/files/save-to-files/save-source';
import { useFolderPicker } from '@/modules/files/save-to-files/use-folder-picker';
import { useSaveToFiles } from '@/modules/files/save-to-files/use-save-to-files';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Loader2, Lock } from 'lucide-react';

export interface SaveToFilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One file, or several picked together (elli-ui#1046). */
  source: SaveToFilesInputSource;
  /**
   * Restrict browsing to this folder subtree (e.g. a project's folder).
   * Required for non-admin users: `GET /file/root` is admin-only, so omitting
   * this makes the picker fail to open for everyone else.
   */
  rootFolderId?: string;
  rootLabel?: string;
  defaultFolderId?: string;
  title?: string;
  allowCreateFolder?: boolean;
  enableExternalUrl?: boolean;
  enableExistingTransfer?: boolean;
  onSaved?: (file: FileItem) => void;
}

/**
 * Pick a folder, save.
 *
 * The dialog used to stack four bordered boxes down the sheet — a file card, a
 * labelled name field, a filter input, then the folder list — so the one
 * decision being made, *which folder*, was the fourth thing down and the same
 * weight as everything above it (elli-ui#1048).
 *
 * It is one column now. The file is a single row whose name is editable in
 * place rather than a form field of its own; navigation and filtering share one
 * bar; and the folder list is the tallest thing in the sheet, because it is the
 * question. Nothing was removed — the rename, the filter, the duplicate
 * warning, the permission lock and the create-folder affordance are all still
 * here, just no longer competing.
 */
export function SaveToFilesDialog({
  open,
  onOpenChange,
  source,
  rootFolderId,
  rootLabel = 'Files',
  defaultFolderId,
  title,
  allowCreateFolder = true,
  enableExternalUrl,
  enableExistingTransfer,
  onSaved,
}: SaveToFilesDialogProps) {
  const sources = useMemo(() => toSaveSourceList(source), [source]);
  const single = sources.length === 1 ? sources[0] : null;
  const [name, setName] = useState(() => (single ? getSourceDefaultName(single) : ''));

  const picker = useFolderPicker({ rootFolderId, rootLabel, defaultFolderId, open });
  const { save, isSaving } = useSaveToFiles({
    source,
    onSaved,
    enableExternalUrl,
    enableExistingTransfer,
  });

  useEffect(() => {
    if (open) setName(single ? getSourceDefaultName(single) : '');
  }, [open, single]);

  const nameError = name.length > 0 ? getUploadNameError(name) : null;

  const duplicateName = useMemo(() => {
    const target = name.trim().toLowerCase();
    if (!target) return false;

    return (picker.folderDetail?.children ?? []).some(
      (child) =>
        child.type === 'FILE' && (child.displayName || child.name || '').toLowerCase() === target
    );
  }, [name, picker.folderDetail?.children]);

  // A multi-selection has no name to validate — each file keeps its own.
  const canSave =
    !!picker.currentFolderId &&
    picker.canSaveHere &&
    !isSaving &&
    (!single || (!!name.trim() && !nameError));

  const handleSave = async () => {
    if (!canSave || !picker.currentFolderId) return;

    const outcome = await save({ parentId: picker.currentFolderId, name });
    if (!outcome) return;

    picker.rememberCurrentFolder();
    onOpenChange(false);
  };

  // `sources.length` and not `single`: a one-file selection can still arrive
  // through the multi path, and "Save 1 files to Files" is what counting
  // without a singular case gets you.
  const heading =
    title ?? (sources.length > 1 ? `Save ${sources.length} files to Files` : 'Save to Files');

  return (
    <ResponsiveDialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{heading}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {single
              ? 'Rename it if you like, then choose where it goes.'
              : 'They all go to the one folder you choose.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col gap-4">
          {single ? (
            <SaveFileRow
              fileName={getSourceFileName(single)}
              mimeType={getSourceMimeType(single)}
              sizeBytes={getSourceSizeBytes(single)}
              extension={getSourceExtension(single)}
              name={name}
              disabled={isSaving}
              invalid={!!nameError}
              onNameChange={setName}
            />
          ) : (
            /* Every file named, scrolling past four. A bare "5 files" is the
               one thing you cannot check before committing to a folder. */
            <div className="max-h-40 overflow-y-auto">
              {sources.map((item, index) => (
                <SaveFileRow
                  key={`${getSourceFileName(item)}-${index}`}
                  fileName={getSourceFileName(item)}
                  mimeType={getSourceMimeType(item)}
                  sizeBytes={getSourceSizeBytes(item)}
                />
              ))}
            </div>
          )}

          {(nameError || duplicateName) && (
            <p className={cn('-mt-2 text-xs', nameError ? 'text-destructive' : 'text-warning')}>
              {nameError ??
                `A file called “${name.trim()}” is already in ${picker.currentFolderName}.`}
            </p>
          )}

          <FolderPickerPanel
            picker={picker}
            allowCreateFolder={allowCreateFolder}
            className="min-h-72"
          />
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            {picker.canSaveHere ? (
              <>
                <span className="shrink-0">Saving to</span>
                <span className="min-w-0 truncate font-medium text-foreground">
                  {picker.currentFolderName}
                </span>
              </>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 text-destructive">
                <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">
                  You cannot save into {picker.currentFolderName}
                </span>
              </span>
            )}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={!canSave} onClick={() => void handleSave()}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * One file. With `onNameChange` the name is an input dressed as text — the
 * rename is right there without a labelled field and a second box around it,
 * and the extension sits beside it as the fixed thing it actually is.
 */
function SaveFileRow({
  fileName,
  mimeType,
  sizeBytes,
  extension,
  name,
  disabled,
  invalid,
  onNameChange,
}: {
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  extension?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  onNameChange?: (value: string) => void;
}) {
  const editable = typeof onNameChange === 'function';

  return (
    <div className="flex min-w-0 items-center gap-3 py-1.5">
      <FileTypeIcon
        fileType="FILE"
        presentation="badge"
        fileName={fileName}
        mimeType={mimeType}
        className="size-9"
      />

      <div className="min-w-0 flex-1">
        {editable ? (
          <div
            className={cn(
              'flex min-w-0 items-center rounded-md border border-transparent px-1.5 py-0.5',
              'focus-within:border-input focus-within:bg-background hover:border-input',
              invalid && 'border-destructive focus-within:border-destructive'
            )}
          >
            <input
              value={name}
              disabled={disabled}
              aria-label="File name"
              aria-invalid={invalid}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-hidden disabled:opacity-60"
              onChange={(event) => onNameChange(event.target.value)}
            />
            {extension && (
              <span className="shrink-0 text-sm text-muted-foreground">{extension}</span>
            )}
          </div>
        ) : (
          <p className="truncate text-sm font-medium">{fileName}</p>
        )}

        {sizeBytes !== undefined && (
          <p className="px-1.5 text-xs text-muted-foreground">{formatFileSize(sizeBytes)}</p>
        )}
      </div>
    </div>
  );
}
