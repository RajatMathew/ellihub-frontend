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
    <div className={cn('flex min-h-0 flex-col gap-3', className)}>
      <div className="flex min-h-8 min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          mode="icon"
          size="sm"
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
      </div>

      {isAtRoot && recentFolders.length > 0 && !isFiltering && (
        <div className="flex flex-wrap gap-1.5">
          <span className="w-full text-xs font-medium text-muted-foreground">Recent</span>
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

      {hasAnyFolder && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={filter}
            placeholder={`Filter folders in ${currentFolderName}`}
            aria-label="Filter folders in the current folder"
            className="ps-9"
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
        {isError ? (
          <QueryErrorState
            title="Failed to load folders"
            onRetry={refetch}
            className="border-0 py-8"
          />
        ) : isLoading ? (
          <FolderListSkeleton />
        ) : (
          <div className="space-y-1 p-1">
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
        <NewFolderInlineForm
          parentId={currentFolderId}
          onCreated={(folder) => navigateTo(folder.id)}
        />
      )}
    </div>
  );
}
