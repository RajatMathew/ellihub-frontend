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
import type { FileExportJob, FileItem } from '@/modules/files/schemas/file.schema';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileArchive,
  Loader2,
  RefreshCcw,
} from 'lucide-react';

type ExportableFolder = Pick<FileItem, 'id' | 'name' | 'displayName'>;

interface FolderExportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: ExportableFolder | null;
  job: FileExportJob | null;
  error: string | null;
  hasAutoDownloaded: boolean;
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

function getProgress(job: FileExportJob | null): number {
  if (!job) return 0;
  if (job.status === 'COMPLETED') return 100;
  if (job.status === 'FAILED' || job.status === 'EXPIRED') return 100;
  if (job.totalFiles > 0) {
    return Math.min(99, Math.round((job.processedFiles / job.totalFiles) * 100));
  }

  return job.status === 'PROCESSING' ? 12 : 4;
}

function getStatusLabel(job: FileExportJob | null, error: string | null): string {
  if (error) return 'Failed';
  if (!job) return 'Starting';
  if (job.status === 'PENDING') return 'Queued';
  if (job.status === 'PROCESSING') return 'Exporting';
  if (job.status === 'COMPLETED') return 'Ready';
  if (job.status === 'EXPIRED') return 'Expired';
  return 'Failed';
}

function getStatusIcon(job: FileExportJob | null, error: string | null) {
  if (error || job?.status === 'FAILED' || job?.status === 'EXPIRED') {
    return <AlertCircle className="size-4 text-destructive" />;
  }

  if (job?.status === 'COMPLETED') {
    return <CheckCircle2 className="size-4 text-success" />;
  }

  return <Loader2 className="size-4 animate-spin text-primary" />;
}

export function FolderExportProgressDialog({
  open,
  onOpenChange,
  folder,
  job,
  error,
  hasAutoDownloaded,
  onRetry,
  onDownloadAgain,
}: FolderExportProgressDialogProps) {
  const progress = getProgress(job);
  const isComplete = job?.status === 'COMPLETED' && !!job.downloadUrl;
  const isRunning = job?.status === 'PENDING' || job?.status === 'PROCESSING' || (!job && !error);
  const canRetry = !!folder && (!!error || job?.status === 'FAILED' || job?.status === 'EXPIRED');
  const statusLabel = getStatusLabel(job, error);
  const folderName = folder?.displayName || folder?.name || 'Folder';
  const processedFiles = job ? Math.min(job.processedFiles, job.totalFiles) : 0;
  const totalFiles = job?.totalFiles ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <FileArchive className="size-5 text-primary" />
            <span className="truncate">Export ZIP</span>
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div className="flex items-start gap-4">
            <ProgressCircle value={progress} size={76} strokeWidth={6}>
              <span className="text-sm font-semibold tabular-nums">{progress}%</span>
            </ProgressCircle>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{folderName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job?.fileName || `${folderName}.zip`}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
                  {getStatusIcon(job, error)}
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
        </DialogBody>

        <DialogFooter>
          {isRunning && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hide
            </Button>
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
