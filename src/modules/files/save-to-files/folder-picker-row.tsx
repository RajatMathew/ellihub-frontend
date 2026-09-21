import { cn } from '@/app/lib/utils';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { ChevronRight, Lock } from 'lucide-react';

interface FolderPickerRowProps {
  folder: FileItem;
  /** Restricted folders are browsable but cannot receive the file. */
  restricted?: boolean;
  onOpen: (folder: FileItem) => void;
}

export function FolderPickerRow({ folder, restricted = false, onOpen }: FolderPickerRowProps) {
  const name = folder.displayName || folder.name || 'Untitled folder';

  return (
    <button
      type="button"
      onClick={() => onOpen(folder)}
      className={cn(
        'flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2.5 text-start transition-colors',
        'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        restricted && 'opacity-70'
      )}
      aria-label={restricted ? `Open ${name} (read only)` : `Open ${name}`}
    >
      <FileTypeIcon fileType="FOLDER" className="size-4.5 shrink-0" />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        {restricted && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            No permission to save here
          </span>
        )}
      </span>

      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

/**
 * A file already sitting in the folder being browsed (elli-ui#1066).
 *
 * Not a button: there is nothing to do with it here. It is dimmed and has no
 * chevron, so the row you *can* act on stays visually distinct from the rows
 * that are only telling you what is in the folder.
 */
export function FolderPickerFileRow({ file }: { file: FileItem }) {
  const name = file.displayName || file.name || 'Untitled file';

  return (
    <div className="flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-muted-foreground">
      <FileTypeIcon
        fileType="FILE"
        fileName={name}
        mimeType={file.mimeType ?? undefined}
        className="size-4.5 shrink-0"
      />
      <span className="min-w-0 flex-1 truncate text-sm" title={name}>
        {name}
      </span>
    </div>
  );
}
