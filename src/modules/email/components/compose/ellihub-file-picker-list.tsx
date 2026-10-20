import { FileFormatBadge } from '@/app/components/file-format-badge';
import { QueryErrorState } from '@/app/components/query-error-state';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Skeleton } from '@/app/components/ui/skeleton';
import { pickerItemName, type PickerItem } from '@/modules/email/lib/ellihub-file-picker';
import { formatFileSize } from '@/modules/email/lib/email-compose-attachments';
import { ChevronRight, Folder } from 'lucide-react';

/**
 * One folder in "Select from ElliHub files" (elli-ui#1335): its sub-folders to
 * open, its files to tick — or why there is nothing to show.
 */
export function EllihubFilePickerList({
  isError,
  isLoading,
  onRetry,
  folders,
  files,
  filter,
  selected,
  onEnter,
  onToggle,
}: {
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  folders: PickerItem[];
  files: PickerItem[];
  filter: string;
  selected: ReadonlyMap<string, PickerItem>;
  onEnter: (folder: PickerItem) => void;
  onToggle: (file: PickerItem) => void;
}) {
  return isError ? (
    <QueryErrorState
      title="Couldn’t open this folder"
      onRetry={onRetry}
      className="m-3 border-0 py-8"
    />
  ) : isLoading ? (
    <div className="space-y-2 p-3" aria-label="Loading folder">
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-8 w-full" />
      ))}
    </div>
  ) : folders.length + files.length === 0 ? (
    <p className="p-6 text-center text-sm text-muted-foreground">
      {filter ? 'Nothing here matches.' : 'This folder is empty.'}
    </p>
  ) : (
    <ul className="divide-y divide-border">
      {folders.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => onEnter(entry)}
            className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-hidden"
          >
            <Folder aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{pickerItemName(entry)}</span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
      {files.map((entry) => (
        <li key={entry.id}>
          <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted">
            <Checkbox checked={selected.has(entry.id)} onCheckedChange={() => onToggle(entry)} />
            <FileFormatBadge fileName={pickerItemName(entry)} className="size-6" />
            <span className="min-w-0 flex-1 truncate">{pickerItemName(entry)}</span>
            {entry.size != null && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(entry.size)}
              </span>
            )}
          </label>
        </li>
      ))}
    </ul>
  );
}
