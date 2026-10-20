import { useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import { FilesBreadcrumbs } from '@/modules/files/components/files-breadcrumbs';
import {
  FolderPickerFileRow,
  FolderPickerRow,
} from '@/modules/files/save-to-files/folder-picker-row';
import { NewFolderInlineForm } from '@/modules/files/save-to-files/new-folder-inline-form';
import { PickerChip, PickerChipRow } from '@/modules/files/save-to-files/picker-chip';
import type { FolderPicker } from '@/modules/files/save-to-files/use-folder-picker';
import { ChevronLeft, EyeOff, FolderClock, FolderPlus, Home, Lock, Search } from 'lucide-react';

interface FolderPickerPanelProps {
  picker: FolderPicker;
  /** Hides the inline create-folder affordance even where the API allows it. */
  allowCreateFolder?: boolean;
  className?: string;
}

function FolderListSkeleton() {
  return (
    <div className="space-y-1" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-4.5 rounded-sm" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

export function FolderPickerPanel({
  picker,
  allowCreateFolder = true,
  className,
}: FolderPickerPanelProps) {
  const {
    breadcrumbs,
    canCreateFolderHere,
    currentFolderId,
    currentFolderName,
    files,
    filter,
    folders,
    isAtRoot,
    isError,
    isLoading,
    navigateTo,
    goUp,
    recentFolders,
    refetch,
    restrictedFolders,
    rootLabel,
    setFilter,
    showRestricted,
    setShowRestricted,
  } = picker;

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const canShowNewFolder =
    allowCreateFolder && canCreateFolderHere && !!currentFolderId && !isLoading && !isError;

  const isFiltering = filter.trim().length > 0;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {/*
        Shortcuts sit above the location bar, beside the project chips, so the
        bar is directly over the list it describes. Shown at every depth and
        while filtering: it used to appear only at the top level, so the rows
        under it jumped each time you opened a folder.
      */}
      {recentFolders.length > 0 && (
        <div className="pb-2">
          <PickerChipRow caption="Recent">
            {recentFolders.map((folder) => (
              <PickerChip
                key={folder.id}
                label={folder.name}
                icon={FolderClock}
                onClick={() => navigateTo(folder.id)}
              />
            ))}
          </PickerChipRow>
        </div>
      )}

      {/*
        Where you are and how to narrow it, on one line (elli-ui#1048). These
        were two full-width rows — a bordered back button beside a breadcrumb,
        then a search box of its own — which put two controls above the list
        before the list had said anything.
      */}
      <div className="flex min-h-9 min-w-0 items-center gap-1.5 border-b pb-2">
        {/* Only where there is somewhere to go back to: at the top it was a
            disabled arrow that looked like it did something. */}
        {!isAtRoot && (
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            size="sm"
            className="shrink-0"
            aria-label="Go to parent folder"
            onClick={goUp}
          >
            <ChevronLeft className="size-4" />
          </Button>
        )}

        {isAtRoot ? (
          <p className="flex min-w-0 flex-1 items-center gap-1.5 truncate ps-1 text-sm font-medium">
            <Home className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            {rootLabel}
          </p>
        ) : (
          <FilesBreadcrumbs
            breadcrumbs={breadcrumbs}
            rootLabel={rootLabel}
            className="mb-0 w-auto min-w-0 flex-1"
            onBreadcrumbClick={navigateTo}
          />
        )}

        {/* Always present, even in an empty folder: hiding it there moved
            New folder along the bar each time you changed folder. */}
        <div className="relative w-32 shrink-0 sm:w-36">
          <Search
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={filter}
            placeholder="Search"
            aria-label={`Search ${currentFolderName}`}
            className="h-8 border-transparent bg-muted/60 ps-8 text-sm focus-visible:border-input focus-visible:bg-popover"
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>

        {/* Beside search rather than under the list, where it read as one
            more row of the folder list. Icon-only so the breadcrumb keeps the
            room it needs once you are a few folders deep. */}
        {canShowNewFolder && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="sm"
                className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="New folder"
                aria-expanded={isCreatingFolder}
                onClick={() => setIsCreatingFolder(true)}
              >
                <FolderPlus className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New folder</TooltipContent>
          </Tooltip>
        )}
      </div>

      {canShowNewFolder && isCreatingFolder && currentFolderId && (
        <div className="pt-2">
          <NewFolderInlineForm
            parentId={currentFolderId}
            onClose={() => setIsCreatingFolder(false)}
            onCreated={(folder) => navigateTo(folder.id)}
          />
        </div>
      )}

      {/* Borderless: the list is the sheet's subject, and a box around it only
          made it one more panel among the rest. */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-1">
        {isError ? (
          <QueryErrorState
            title="Failed to load folders"
            onRetry={refetch}
            className="border-0 py-8"
          />
        ) : isLoading ? (
          <FolderListSkeleton />
        ) : (
          <div className="space-y-0.5 py-1">
            {folders.map((folder) => (
              <FolderPickerRow key={folder.id} folder={folder} onOpen={(f) => navigateTo(f.id)} />
            ))}

            {folders.length === 0 && files.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {isFiltering ? 'Nothing here matches that name.' : `${currentFolderName} is empty.`}
              </p>
            )}

            {/*
              What is already filed here (elli-ui#1066). Below the folders and
              visibly inert — the picker picks a folder, and these are here so
              you can see you are about to save a second copy of something, or
              that the folder you are about to commit to is the wrong one.
            */}
            {files.length > 0 && (
              <div className={cn(folders.length > 0 && 'mt-1 border-t pt-1')}>
                {files.map((file) => (
                  <FolderPickerFileRow key={file.id} file={file} />
                ))}
              </div>
            )}

            {restrictedFolders.length > 0 && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 px-3 text-muted-foreground"
                  aria-expanded={showRestricted}
                  onClick={() => setShowRestricted(!showRestricted)}
                >
                  {showRestricted ? (
                    <EyeOff className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Lock className="size-3.5" aria-hidden="true" />
                  )}
                  {showRestricted
                    ? 'Hide folders you cannot save to'
                    : `${restrictedFolders.length} folder${
                        restrictedFolders.length === 1 ? '' : 's'
                      } hidden — no permission`}
                </Button>

                {showRestricted &&
                  restrictedFolders.map((folder) => (
                    <FolderPickerRow
                      key={folder.id}
                      folder={folder}
                      restricted
                      onOpen={(f) => navigateTo(f.id)}
                    />
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
