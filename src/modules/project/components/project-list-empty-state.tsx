import { Button } from '@/app/components/ui/button';
import { FolderOpen, SearchX } from 'lucide-react';

interface ProjectListEmptyStateProps {
  year: number | null;
  /** The search in effect, if any: then the search, not the year, emptied the page. */
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function ProjectListEmptyState({
  year,
  searchQuery,
  onClearSearch,
}: ProjectListEmptyStateProps) {
  if (searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <SearchX className="mb-3 size-10 text-muted-foreground/70" aria-hidden="true" />
        <p className="text-sm font-medium">No projects match “{searchQuery}”.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Search by name, job or contract number, address, GC or lead PM.
        </p>
        {onClearSearch && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onClearSearch}>
            Clear search
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
      <FolderOpen className="mb-3 size-10 text-muted-foreground/70" />
      <p className="text-sm font-medium">
        {year === null ? 'No projects found.' : `No projects found for ${year}.`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Try another year or clear the active status filter.
      </p>
    </div>
  );
}
