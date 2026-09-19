/* eslint-disable react-hooks/set-state-in-effect -- resetting the name field when the dialog opens is dialog lifecycle, not external synchronization */

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/app/components/ui/responsive-dialog';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import { getUploadNameError } from '@/modules/files/lib/file-upload-policy';
import { FolderPickerPanel } from '@/modules/files/save-to-files/folder-picker-panel';
import {
  getSourceDefaultName,
  getSourceFileName,
  getSourceMimeType,
  getSourceSizeBytes,
  toSaveSourceList,
  type SaveToFilesInputSource,
} from '@/modules/files/save-to-files/save-source';
import { useFolderPicker } from '@/modules/files/save-to-files/use-folder-picker';
import { useSaveToFiles } from '@/modules/files/save-to-files/use-save-to-files';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Loader2, Lock, Save } from 'lucide-react';

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

export function SaveToFilesDialog({
  open,
  onOpenChange,
  source,
  rootFolderId,
  rootLabel = 'Files',
  defaultFolderId,
  title = 'Save to Files',
  allowCreateFolder = true,
  enableExternalUrl,
  enableExistingTransfer,
  onSaved,
}: SaveToFilesDialogProps) {
  const sources = useMemo(() => toSaveSourceList(source), [source]);
  const single = sources.length === 1 ? sources[0] : null;
  const sourceFileName = single ? getSourceFileName(single) : `${sources.length} files`;
  const sourceSize = single ? getSourceSizeBytes(single) : undefined;
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

  return (
    <ResponsiveDialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {single
              ? 'Choose a destination folder, then save.'
              : `Choose one folder for all ${sources.length} files, then save.`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col gap-4">
          {single ? (
            <div className="flex min-w-0 items-center gap-3 rounded-md border bg-muted/30 p-3">
              <FileTypeIcon
                fileType="FILE"
                presentation="badge"
                fileName={sourceFileName}
                mimeType={getSourceMimeType(single)}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{sourceFileName}</p>
                {sourceSize !== undefined && (
                  <p className="text-xs text-muted-foreground">{formatFileSize(sourceSize)}</p>
                )}
              </div>
            </div>
          ) : (
            /* Every file named, scrolling past four. A bare "5 files" is the
               one thing you cannot check before committing to a folder. */
            <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border bg-muted/30 p-3">
              {sources.map((item, index) => (
                <div
                  key={`${getSourceFileName(item)}-${index}`}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  <FileTypeIcon
                    fileType="FILE"
                    presentation="badge"
                    fileName={getSourceFileName(item)}
                    mimeType={getSourceMimeType(item)}
                    className="size-6"
                  />
                  <p className="min-w-0 flex-1 truncate text-sm">{getSourceFileName(item)}</p>
                </div>
              ))}
            </div>
          )}

          {single && (
            <div className="space-y-2">
              <Label htmlFor="save-to-files-name">File name</Label>
              <Input
                id="save-to-files-name"
                value={name}
                disabled={isSaving}
                aria-invalid={!!nameError}
                placeholder="Document name"
                onChange={(event) => setName(event.target.value)}
              />
              {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              {!nameError && duplicateName && (
                <p className="text-xs text-muted-foreground">
                  A file with this name already exists in {picker.currentFolderName}.
                </p>
              )}
            </div>
          )}

          <FolderPickerPanel
            picker={picker}
            allowCreateFolder={allowCreateFolder}
            className="min-h-64"
          />
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className="items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            {picker.canSaveHere ? (
              <>
                Saving to{' '}
                <span className="font-medium text-foreground">{picker.currentFolderName}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-destructive">
                <Lock className="size-3.5" aria-hidden="true" />
                You cannot save into {picker.currentFolderName}
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
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
