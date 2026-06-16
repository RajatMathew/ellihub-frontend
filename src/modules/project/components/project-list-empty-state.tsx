import { FolderOpen } from 'lucide-react';

interface ProjectListEmptyStateProps {
  year: number | null;
}

export function ProjectListEmptyState({ year }: ProjectListEmptyStateProps) {
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
