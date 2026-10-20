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
import { SaveScopeChips } from '@/modules/files/save-to-files/save-scope-chips';
import type { SaveToFilesScope } from '@/modules/files/save-to-files/save-scopes';
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
import { useSaveScopeRoot } from '@/modules/files/save-to-files/use-save-scope-root';
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
  /**
   * Projects the save can go under, shown as chips above the folders
   * (elli-ui#1067). Picking one moves the picker into that project's folder.
   * `rootFolderId` is taken to be the first one's folder.
   */
  projectScopes?: readonly SaveToFilesScope[];
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
  projectScopes,
  defaultFolderId,
  title,
  allowCreateFolder = true,
  enableExternalUrl,
  enableExistingTransfer,
  onSaved,
}: SaveToFilesDialogProps) {
  const sources = useMemo(() => toSaveSourceList(source), [source]);
  const single = sources.length === 1 ? sources[0] : null;
  /**
   * One editable name per file, positionally (elli-ui#1063). A single file
   * could always be renamed on the way in; a selection of five could not, so
   * saving five attachments meant filing them under `image003.png` and then
   * renaming them one at a time in Files afterwards.
   */
  const [names, setNames] = useState<string[]>(() => sources.map(getSourceDefaultName));

  const scopeRoot = useSaveScopeRoot({ scopes: projectScopes, rootFolderId, rootLabel, open });
  const picker = useFolderPicker({
    rootFolderId: scopeRoot.rootFolderId,
    rootLabel: scopeRoot.rootLabel,
    defaultFolderId,
    open,
  });
  const { save, isSaving } = useSaveToFiles({
    source,
    onSaved,
    enableExternalUrl,
    enableExistingTransfer,
  });

  /**
   * Reset on a signature, not on `sources`.
   *
   * Callers pass their source inline (`source={{ kind: 'lazy', ... }}`), so the
   * memo above hands back a new array on every render. An effect depending on
   * it would call `setNames` with a fresh array each time, which is never
   * `Object.is`-equal to the last one, and the dialog would re-render forever.
   * The signature only changes when the files actually change.
   */
  const defaultNames = useMemo(() => sources.map(getSourceDefaultName), [sources]);
  const namesSignature = defaultNames.join('\u0000');

  useEffect(() => {
    if (open) setNames(namesSignature.length > 0 ? namesSignature.split('\u0000') : []);
  }, [namesSignature, open]);

  const setNameAt = (index: number, value: string) =>
    setNames((current) => current.map((entry, position) => (position === index ? value : entry)));

  /** Per file, so the message names the one that is wrong. */
  const nameErrors = useMemo(
    () => names.map((entry) => (entry.length > 0 ? getUploadNameError(entry) : null)),
    [names]
  );

  const existingFileNames = useMemo(
    () =>
      new Set(
        (picker.folderDetail?.children ?? [])
          .filter((child) => child.type === 'FILE')
          .map((child) => (child.displayName || child.name || '').toLowerCase())
      ),
    [picker.folderDetail?.children]
  );

  const duplicateNames = useMemo(
    () => names.map((entry) => existingFileNames.has(entry.trim().toLowerCase())),
    [existingFileNames, names]
  );

  const firstProblem = useMemo(() => {
    const errorIndex = nameErrors.findIndex((entry) => entry !== null);
    if (errorIndex >= 0) {
      return { tone: 'error' as const, message: nameErrors[errorIndex]! };
    }

    const duplicateIndex = duplicateNames.findIndex(Boolean);
    if (duplicateIndex >= 0) {
      return {
        tone: 'warning' as const,
        message: `A file called “${names[duplicateIndex]?.trim()}” is already in ${picker.currentFolderName}.`,
      };
    }

    return null;
  }, [duplicateNames, nameErrors, names, picker.currentFolderName]);

  const canSave =
    !!picker.currentFolderId &&
    picker.canSaveHere &&
    !isSaving &&
    names.every((entry) => entry.trim().length > 0) &&
    nameErrors.every((entry) => entry === null);

  const handleSave = async () => {
    if (!canSave || !picker.currentFolderId) return;

    const outcome = await save({ parentId: picker.currentFolderId, names });
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
      <ResponsiveDialogContent className="bg-popover" drawerClassName="bg-popover">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{heading}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {single
              ? 'Rename it if you like, then choose where it goes.'
              : 'Rename any of them if you like. They all go to the one folder you choose.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="flex flex-col gap-4">
          {/* Every file named and every name editable, scrolling past four.
              A bare "5 files" is the one thing you cannot check before
              committing to a folder. */}
          <div className={cn(!single && 'max-h-44 overflow-y-auto')}>
            {sources.map((item, index) => (
              <SaveFileRow
                key={`${getSourceFileName(item)}-${index}`}
                fileName={getSourceFileName(item)}
                mimeType={getSourceMimeType(item)}
                sizeBytes={getSourceSizeBytes(item)}
                extension={getSourceExtension(item)}
                name={names[index] ?? ''}
                disabled={isSaving}
                invalid={!!nameErrors[index]}
                onNameChange={(value) => setNameAt(index, value)}
              />
            ))}
          </div>

          {firstProblem && (
            <p
              className={cn(
                '-mt-2 text-xs',
                firstProblem.tone === 'error' ? 'text-destructive' : 'text-warning'
              )}
            >
              {firstProblem.message}
            </p>
          )}

          {projectScopes && projectScopes.length > 0 && (
            <div className="-mb-2 flex min-w-0 flex-col gap-1">
              <SaveScopeChips
                scopes={projectScopes}
                selectedId={scopeRoot.selectedId}
                loadingId={scopeRoot.loadingId}
                disabled={isSaving}
                onSelect={scopeRoot.select}
              />
              {scopeRoot.failedLabel && (
                <p className="text-xs text-destructive">
                  Could not open the folder for {scopeRoot.failedLabel}.
                </p>
              )}
            </div>
          )}

          {/* A fixed height, not a minimum: the dialog used to grow and
              shrink with every folder you opened, so the footer jumped. */}
          <FolderPickerPanel
            picker={picker}
            allowCreateFolder={allowCreateFolder}
            className="h-80 sm:h-96"
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
              'flex min-w-0 items-center rounded-md border border-transparent bg-muted/60 px-2 py-1',
              'focus-within:border-input focus-within:bg-popover hover:border-input',
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
          <p className="mt-0.5 px-2 text-xs text-muted-foreground">{formatFileSize(sizeBytes)}</p>
        )}
      </div>
    </div>
  );
}
