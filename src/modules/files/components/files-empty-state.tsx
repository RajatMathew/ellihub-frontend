import { FolderOpen, SearchX } from 'lucide-react';

/**
 * What an empty Files listing says. With a search or date range applied the
 * folder may be full; it is the filter that found nothing, and telling the
 * user to upload a file there was wrong.
 */
export function FilesEmptyState({ filtered = false }: { filtered?: boolean }) {
  const Icon = filtered ? SearchX : FolderOpen;

  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon className="size-10 text-muted-foreground/50" />
      <p className="text-sm font-medium">{filtered ? 'No matching files' : 'No files yet'}</p>
      <p className="text-xs text-muted-foreground">
        {filtered
          ? 'Nothing here matches the search or date range. Try another search, or widen the scope.'
          : 'Upload a file or create a folder to get started.'}
      </p>
    </div>
  );
}
