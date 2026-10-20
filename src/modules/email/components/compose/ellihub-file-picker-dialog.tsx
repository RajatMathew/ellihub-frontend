import { useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { toastApiError } from '@/app/lib/toast-api-error';
import { EllihubFilePickerList } from '@/modules/email/components/compose/ellihub-file-picker-list';
import {
  pickerEntries,
  pickerItemName,
  toAttachmentFile,
  type PickerItem,
} from '@/modules/email/lib/ellihub-file-picker';
import { formatFileSize } from '@/modules/email/lib/email-compose-attachments';
import { filesApi } from '@/modules/files/api/files.api';
import { useFolderDetailQuery, useRootFolderQuery } from '@/modules/files/hooks/files.hooks';
import { ChevronRight, LoaderCircle } from 'lucide-react';

type Crumb = { id: string; name: string };

/**
 * "Select from ElliHub files" (elli-ui#1335): browse Files the way the Files
 * page does, tick what to send, and attach it — fetched and handed to the
 * composer as ordinary files, so the size budget and duplicate check apply
 * exactly as to a file from disk. Ticks survive moving between folders.
 */
export function EllihubFilePickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (files: File[]) => void;
}) {
  const [path, setPath] = useState<Crumb[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Map<string, PickerItem>>(new Map());
  const [attaching, setAttaching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const root = useRootFolderQuery(open);
  const folderId = path.at(-1)?.id ?? root.data?.id;
  const folder = useFolderDetailQuery(folderId, open);
  const { folders, files } = pickerEntries(folder.data?.children, filter);
  const isLoading = root.isLoading || folder.isLoading;
  const isError = root.isError || folder.isError;

  const close = (next: boolean) => {
    if (next) return onOpenChange(true);
    abortRef.current?.abort();
    setPath([]);
    setFilter('');
    setSelected(new Map());
    onOpenChange(false);
  };
  const enter = (crumb: Crumb | null, depth: number) => {
    setPath((current) => (crumb ? [...current, crumb] : current.slice(0, depth)));
    setFilter('');
  };
  const toggle = (item: PickerItem) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });

  const attach = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setAttaching(true);
    try {
      const picked = await Promise.all(
        [...selected.values()].map(async (item) =>
          toAttachmentFile(item, await filesApi.readFileBlob(item.id, controller.signal))
        )
      );
      onPick(picked);
      close(false);
    } catch (error) {
      if (!controller.signal.aborted) toastApiError(error, 'Could not attach those files.');
    } finally {
      setAttaching(false);
    }
  };

  const selectedBytes = [...selected.values()].reduce((sum, item) => sum + (item.size ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className="max-w-lg"
        // Rendered inside the composer's form, so React would hand its keys to
        // the form too: Escape would close the composer and Cmd+Enter send the
        // email. They belong to this dialog alone.
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className="border-b border-border px-6 py-3.5">
          <DialogTitle className="text-lg">Select from ElliHub files</DialogTitle>
          <DialogDescription className="sr-only">
            Browse Files and tick the files to attach to this email.
          </DialogDescription>
          <nav aria-label="Folder" className="flex min-w-0 flex-wrap items-center gap-1 text-xs">
            {[{ id: '', name: 'Files' }, ...path].map((crumb, index, all) => (
              <span key={crumb.id || 'root'} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight aria-hidden="true" className="size-3 text-muted-foreground" />
                )}
                <button
                  type="button"
                  disabled={index === all.length - 1}
                  onClick={() => enter(null, index)}
                  className="max-w-40 cursor-pointer truncate rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:font-medium disabled:text-foreground"
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </nav>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-2 px-6 py-3">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter this folder"
            aria-label="Filter this folder"
          />
          <div className="h-72 overflow-y-auto rounded-md border border-border">
            <EllihubFilePickerList
              isError={isError}
              isLoading={isLoading}
              onRetry={() => void (root.isError ? root.refetch() : folder.refetch())}
              folders={folders}
              files={files}
              filter={filter}
              selected={selected}
              onEnter={(entry) => enter({ id: entry.id, name: pickerItemName(entry) }, 0)}
              onToggle={toggle}
            />
          </div>
        </DialogBody>

        <DialogFooter className="flex items-center gap-2 border-t border-border px-6 py-3.5">
          <p className="me-auto text-xs text-muted-foreground" aria-live="polite">
            {selected.size > 0
              ? `${selected.size} selected · ${formatFileSize(selectedBytes)}`
              : 'No files selected'}
          </p>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={selected.size === 0 || attaching}
            onClick={() => void attach()}
          >
            {attaching && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {attaching ? 'Attaching…' : `Attach${selected.size ? ` (${selected.size})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
