import { FolderOpen } from 'lucide-react';

export function FilesEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <FolderOpen className="size-10 text-muted-foreground/50" />
      <p className="text-sm font-medium">No files yet</p>
      <p className="text-xs text-muted-foreground">
        Upload a file or create a folder to get started.
      </p>
    </div>
  );
}
