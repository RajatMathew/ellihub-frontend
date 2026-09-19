import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { FilesBreadcrumbs } from '@/modules/files/components/files-breadcrumbs';
import { FolderPickerRow } from '@/modules/files/save-to-files/folder-picker-row';
import { NewFolderInlineForm } from '@/modules/files/save-to-files/new-folder-inline-form';
import type { FolderPicker } from '@/modules/files/save-to-files/use-folder-picker';
import { ChevronLeft, EyeOff, FolderOpen, Home, Lock, Search } from 'lucide-react';

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

  const hasAnyFolder = folders.length > 0 || restrictedFolders.length > 0;
  const isFiltering = filter.trim().length > 0;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {/*
        Where you are and how to narrow it, on one line (elli-ui#1048). These
        were two full-width rows — a bordered back button beside a breadcrumb,
        then a search box of its own — which put two controls above the list
        before the list had said anything.
      */}
      <div className="flex min-h-9 min-w-0 items-center gap-1 border-b pb-2">
        <Button
          type="button"
          variant="ghost"
          mode="icon"
          size="sm"
          className="shrink-0"
          disabled={isAtRoot}
          aria-label="Go to parent folder"
          onClick={goUp}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {isAtRoot ? (
          <p className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-medium">
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

        {hasAnyFolder && (
          <div className="relative w-40 shrink-0">
            <Search
              className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={filter}
              placeholder="Filter"
              aria-label={`Filter folders in ${currentFolderName}`}
              className="h-8 border-transparent bg-muted/50 ps-8 text-sm focus-visible:border-input focus-visible:bg-background"
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
        )}
      </div>

      {isAtRoot && recentFolders.length > 0 && !isFiltering && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          <span className="text-xs font-medium text-muted-foreground">Recent</span>
          {recentFolders.map((folder) => (
            <Button
              key={folder.id}
              type="button"
              variant="outline"
              size="sm"
              className="max-w-full"
              onClick={() => navigateTo(folder.id)}
            >
              <FolderOpen className="size-3.5" aria-hidden="true" />
              <span className="truncate">{folder.name}</span>
            </Button>
          ))}
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

            {folders.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {isFiltering
                  ? 'No folders match that name.'
                  : `No subfolders in ${currentFolderName}.`}
              </p>
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

      {allowCreateFolder && canCreateFolderHere && currentFolderId && !isLoading && !isError && (
        <div className="border-t pt-2">
          <NewFolderInlineForm
            parentId={currentFolderId}
            onCreated={(folder) => navigateTo(folder.id)}
          />
        </div>
      )}
    </div>
  );
}
