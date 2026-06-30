import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Progress, ProgressCircle } from '@/app/components/ui/progress';
import {
  getFolderExportProgress,
  getFolderExportStatusLabel,
  isFolderExportCancelled,
  isFolderExportFailed,
  isFolderExportRunning,
  type ExportableFolder,
} from '@/modules/files/lib/folder-export';
import type { FileExportJob } from '@/modules/files/schemas/file.schema';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  RefreshCcw,
  XCircle,
} from 'lucide-react';

interface FolderExportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: ExportableFolder | null;
  job: FileExportJob | null;
  error: string | null;
  isCancelling: boolean;
  hasAutoDownloaded: boolean;
  onCancel: () => void;
  onRetry: () => void;
  onDownloadAgain: () => void;
}

function toBigInt(value: string | number | null | undefined): bigint {
  try {
    return BigInt(value ?? 0);
  } catch {
    return 0n;
  }
}

function formatBytes(value: string | number | null | undefined): string {
  const bytes = toBigInt(value);
  if (bytes <= 0n) return '-';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let whole = bytes;
  let remainder = 0n;

  while (whole >= 1024n && unitIndex < units.length - 1) {
    remainder = whole % 1024n;
    whole /= 1024n;
    unitIndex += 1;
  }

  if (unitIndex === 0) return `${whole.toString()} ${units[unitIndex]}`;

  const decimal = Number((remainder * 10n) / 1024n);
  return `${whole.toString()}.${decimal} ${units[unitIndex]}`;
}

function getStatusIcon(job: FileExportJob | null, error: string | null, isCancelling: boolean) {
  if (isCancelling) return <Loader2 className="size-4 animate-spin text-primary" />;

  if (isFolderExportFailed(job, error)) {
    return <AlertCircle className="size-4 text-destructive" />;
  }

  if (job?.status === 'COMPLETED') {
    return <CheckCircle2 className="size-4 text-success" />;
  }

  if (isFolderExportCancelled(job)) {
    return <XCircle className="size-4 text-muted-foreground" />;
  }

  return <Loader2 className="size-4 animate-spin text-primary" />;
}

export function FolderExportProgressDialog({
  open,
  onOpenChange,
  folder,
  job,
  error,
  isCancelling,
  hasAutoDownloaded,
  onCancel,
  onRetry,
  onDownloadAgain,
}: FolderExportProgressDialogProps) {
  const progress = getFolderExportProgress(job);
  const isComplete = job?.status === 'COMPLETED' && !!job.downloadUrl;
  const isStarting = !job && !error;
  const isRunning = isStarting || isFolderExportRunning(job);
  const canRetry =
    !!folder &&
    (!!error ||
      job?.status === 'FAILED' ||
      job?.status === 'EXPIRED' ||
      job?.status === 'CANCELLED');
  const statusLabel = getFolderExportStatusLabel(job, error, isCancelling);
  const folderName = folder?.displayName || folder?.name || 'Folder';
  const processedFiles = job ? Math.min(job.processedFiles, job.totalFiles) : 0;
  const totalFiles = job?.totalFiles ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-2.5 pr-6">
            <FileArchive className="size-5 text-primary" />
            <span className="truncate">Export ZIP</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="flex min-w-0 flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ProgressCircle value={progress} size={76} strokeWidth={6}>
              <span className="text-sm font-semibold tabular-nums">{progress}%</span>
            </ProgressCircle>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{folderName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job?.fileName || `${folderName}.zip`}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
                  {getStatusIcon(job, error, isCancelling)}
                  {statusLabel}
                </span>
              </div>

              <Progress value={progress} className="h-2" />

              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Files</p>
                  <p className="font-medium text-foreground tabular-nums">
                    {totalFiles > 0 ? `${processedFiles}/${totalFiles}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Size</p>
                  <p className="font-medium text-foreground tabular-nums">
                    {formatBytes(job?.processedBytes)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium text-foreground tabular-nums">
                    {formatBytes(job?.totalBytes)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium text-foreground">
                    {job?.expiresAt ? new Date(job.expiresAt).toLocaleTimeString() : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {isComplete && (
            <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2 text-sm text-success">
              {hasAutoDownloaded ? 'Download started.' : 'Archive is ready.'}
            </div>
          )}

          {job?.status === 'CANCELLED' && (
            <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
              Export was cancelled. You can start it again when needed.
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {isRunning && (
            <>
              <Button variant="outline" onClick={onCancel} disabled={isCancelling || !job}>
                {isCancelling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                {isCancelling ? 'Cancelling' : 'Cancel'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Hide
              </Button>
            </>
          )}
          {!isRunning && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
          {canRetry && (
            <Button onClick={onRetry}>
              <RefreshCcw className="size-4" />
              Retry
            </Button>
          )}
          {isComplete && (
            <Button onClick={onDownloadAgain}>
              <Download className="size-4" />
              Download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
