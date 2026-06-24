import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import {
  getFolderExportProgress,
  getFolderExportStatusLabel,
  isFolderExportRunning,
  type ExportableFolder,
} from '@/modules/files/lib/folder-export';
import type { FileExportJob } from '@/modules/files/schemas/file.schema';
import { FileArchive, Loader2, XCircle } from 'lucide-react';

interface FolderExportStatusCardProps {
  visible: boolean;
  folder: ExportableFolder | null;
  job: FileExportJob | null;
  error: string | null;
  isCancelling: boolean;
  onView: () => void;
  onCancel: () => void;
}

export function FolderExportStatusCard({
  visible,
  folder,
  job,
  error,
  isCancelling,
  onView,
  onCancel,
}: FolderExportStatusCardProps) {
  if (!visible) return null;

  const progress = getFolderExportProgress(job);
  const folderName = folder?.displayName || folder?.name || 'Folder';
  const statusLabel = getFolderExportStatusLabel(job, error, isCancelling);
  const canCancel = isFolderExportRunning(job) && !isCancelling;

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 max-w-[calc(100vw-2rem)] rounded-md border bg-background p-4 shadow-lg sm:left-auto sm:right-6 sm:bottom-6 sm:w-96"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileArchive className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Exporting ZIP</p>
              <p className="truncate text-xs text-muted-foreground">
                {job?.fileName || `${folderName}.zip`}
              </p>
            </div>
            <span className="max-w-28 shrink-0 truncate text-xs font-medium text-muted-foreground">
              {statusLabel}
            </span>
          </div>

          <Progress value={progress} className="h-1.5" />

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onView}>
                View
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel} disabled={!canCancel}>
                {isCancelling ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <XCircle className="size-3.5" />
                )}
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
