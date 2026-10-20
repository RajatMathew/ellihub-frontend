import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/app/lib/utils';
import {
  dropPrompt,
  useOfferedDropDestination,
  type DropDestination,
} from '@/modules/files/global-drop/global-drop';
import {
  useGlobalFileDrag,
  type GlobalFileDropHandlers,
} from '@/modules/files/global-drop/use-global-file-drag';
import { useRootFolderQuery } from '@/modules/files/hooks/files.hooks';
import { SaveToFilesDialog } from '@/modules/files/save-to-files';
import { ArrowUp, Folder } from 'lucide-react';

/**
 * Upload from anywhere (elli-ui#1333). Drag files over any page and a small
 * island rises at the foot of the screen. Drop them anywhere and Save to Files
 * opens with them — renamed if you like, filed wherever you choose. A page with
 * a folder open (Files, a project's Files tab) starts the dialog there and the
 * island names it; anywhere else it starts at the top of Files and names
 * nothing, since nothing has been chosen yet. Saving goes through the upload
 * queue, so the transfer tray shows its progress. Over a drop zone of its own
 * — the composer, an attachment field — the island steps aside.
 *
 * Away from a folder, the dialog browses the whole of Files, which only an
 * administrator may open; the root is asked for once a drag starts, and the
 * island stays away for anyone it is refused to.
 */
export function GlobalFileDropIsland() {
  const handlers = useRef<GlobalFileDropHandlers>({ accepting: false, onDrop: () => {} });
  const drag = useGlobalFileDrag(handlers);
  const offered = useOfferedDropDestination();
  const root = useRootFolderQuery(drag.active && !offered);
  // Somewhere to start Save to Files: the page's folder, or the top of Files.
  const canSave = offered !== null || root.isSuccess;
  const [dropped, setDropped] = useState<{
    files: File[];
    destination: DropDestination | null;
  } | null>(null);
  const sources = useMemo(
    () => (dropped?.files ?? []).map((file) => ({ kind: 'file' as const, file })),
    [dropped]
  );

  useEffect(() => {
    handlers.current = {
      accepting: canSave,
      onDrop: (files) => {
        if (canSave) setDropped({ files, destination: offered });
      },
    };
  }, [canSave, offered]);

  const showDrag = drag.active && canSave;

  return (
    <>
      {showDrag && (
        <>
          {/* The whole page is the target; a faint wash says so without hiding it. */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 bg-primary/5 ring-2 ring-inset ring-primary/25 motion-safe:animate-in motion-safe:fade-in"
          />
          <div
            role="status"
            aria-live="polite"
            className={cn(
              'pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4',
              'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:zoom-in-95 motion-safe:duration-200'
            )}
          >
            <div className="flex max-w-full items-center gap-3 rounded-full bg-primary py-2.5 pe-5 ps-2.5 text-primary-foreground shadow-lg shadow-primary/25">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-foreground/15">
                <ArrowUp aria-hidden="true" className="size-4 motion-safe:animate-bounce" />
              </span>
              {offered ? (
                <span className="min-w-0">
                  <span className="block text-xs text-primary-foreground/75">
                    {dropPrompt(drag.count)}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
                    <Folder aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">Starting in {offered.label}</span>
                  </span>
                </span>
              ) : (
                <span className="min-w-0 truncate text-sm font-semibold">
                  {dropPrompt(drag.count)}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {dropped && (
        <SaveToFilesDialog
          open
          onOpenChange={(open) => {
            if (!open) setDropped(null);
          }}
          source={sources}
          defaultFolderId={dropped.destination?.folderId}
          rootFolderId={dropped.destination?.rootFolderId}
          rootLabel={dropped.destination?.rootLabel}
        />
      )}
    </>
  );
}
