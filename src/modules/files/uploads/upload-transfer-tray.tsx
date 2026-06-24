import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { cn } from '@/app/lib/utils';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { useUploadManager, type UploadTask } from '@/modules/files/uploads/upload-manager';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';

type UploadSummary = {
  activeCount: number;
  failedCount: number;
  completedCount: number;
  terminalCount: number;
  progress: number;
  title: string;
  status: string;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const size = bytes / 1024 ** index;

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function isActive(task: UploadTask): boolean {
  return task.status === 'queued' || task.status === 'uploading' || task.status === 'finalizing';
}

function canCancel(task: UploadTask): boolean {
  return task.status === 'queued' || task.status === 'uploading';
}

function canRetry(task: UploadTask): boolean {
  return task.status === 'failed' && task.failureStage !== 'finalizing';
}

function getTaskStatusLabel(task: UploadTask): string {
  switch (task.status) {
    case 'queued':
      return 'Queued';
    case 'uploading':
      return 'Uploading';
    case 'finalizing':
      return 'Finishing';
    case 'completed':
      return 'Complete';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Pending';
  }
}

function getTaskStatusIcon(task: UploadTask) {
  if (task.status === 'completed') return <CheckCircle2 className="size-3.5 text-success" />;
  if (task.status === 'failed') return <AlertCircle className="size-3.5 text-destructive" />;
  if (task.status === 'cancelled') return <XCircle className="size-3.5 text-muted-foreground" />;
  return <Loader2 className="size-3.5 animate-spin text-primary" />;
}

function getSummary(tasks: UploadTask[]): UploadSummary {
  const activeCount = tasks.filter(isActive).length;
  const failedCount = tasks.filter((task) => task.status === 'failed').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const terminalCount = tasks.length - activeCount;
  const totalBytes = tasks.reduce((sum, task) => sum + Math.max(task.totalBytes, task.fileSize), 0);
  const uploadedBytes = tasks.reduce((sum, task) => {
    if (task.status === 'completed') return sum + Math.max(task.totalBytes, task.fileSize);
    return sum + task.uploadedBytes;
  }, 0);
  const progress = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;

  if (activeCount > 0) {
    return {
      activeCount,
      failedCount,
      completedCount,
      terminalCount,
      progress,
      title: activeCount === 1 ? 'Uploading 1 file' : `Uploading ${activeCount} files`,
      status: `${progress}%`,
    };
  }

  if (failedCount > 0) {
    return {
      activeCount,
      failedCount,
      completedCount,
      terminalCount,
      progress,
      title: failedCount === 1 ? '1 upload failed' : `${failedCount} uploads failed`,
      status: 'Needs review',
    };
  }

  return {
    activeCount,
    failedCount,
    completedCount,
    terminalCount,
    progress: 100,
    title: completedCount === 1 ? 'Upload complete' : `${completedCount} uploads complete`,
    status: 'Done',
  };
}

function UploadTaskRow({ task }: { task: UploadTask }) {
  const { cancelUpload, clearUpload, retryUpload } = useUploadManager();
  const statusLabel = getTaskStatusLabel(task);
  const transferred = task.status === 'completed' ? task.totalBytes : task.uploadedBytes;

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background">
          <FileTypeIcon fileType="FILE" fileName={task.fileName} className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{task.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {task.label ?? task.fileName}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {getTaskStatusIcon(task)}
              {statusLabel}
            </span>
          </div>

          <Progress
            value={task.status === 'completed' ? 100 : task.progress}
            className={cn('h-1.5', task.status === 'failed' && 'bg-destructive/15')}
            indicatorClassName={cn(task.status === 'failed' && 'bg-destructive')}
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatBytes(transferred)} / {formatBytes(task.totalBytes || task.fileSize)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {canRetry(task) && (
                <Button size="sm" variant="outline" onClick={() => retryUpload(task.id)}>
                  <RotateCcw className="size-3.5" />
                  Retry
                </Button>
              )}
              {canCancel(task) && (
                <Button size="sm" variant="outline" onClick={() => cancelUpload(task.id)}>
                  <XCircle className="size-3.5" />
                  Cancel
                </Button>
              )}
              {!isActive(task) && (
                <Button
                  size="sm"
                  variant="ghost"
                  mode="icon"
                  aria-label={`Clear ${task.displayName}`}
                  onClick={() => clearUpload(task.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>

          {task.error && (
            <p className="text-xs text-destructive">
              {task.failureStage === 'finalizing'
                ? `${task.error} The file may already be uploaded; attach it again from the page if needed.`
                : task.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function UploadTransferTray() {
  const {
    tasks,
    open,
    collapsed,
    cancelAll,
    clearTerminalUploads,
    setCollapsed,
  } = useUploadManager();

  if (!open || tasks.length === 0) return null;

  const summary = getSummary(tasks);
  const hasActiveTasks = summary.activeCount > 0;
  const hasTerminalTasks = summary.terminalCount > 0;

  if (collapsed) {
    return (
      <div
        className="fixed inset-x-4 bottom-4 z-50 rounded-md border bg-background p-3 shadow-lg sm:left-auto sm:right-6 sm:w-96"
        aria-live="polite"
      >
        <button
          type="button"
          className="flex w-full items-center gap-3 text-left"
          onClick={() => setCollapsed(false)}
          aria-label="Expand uploads"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {hasActiveTasks ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-foreground">{summary.title}</p>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{summary.status}</span>
            </div>
            <Progress value={summary.progress} className="h-1.5" />
          </div>
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 rounded-md border bg-background shadow-xl sm:left-auto sm:right-6 sm:bottom-6 sm:w-[440px]"
      aria-live="polite"
    >
      <div className="border-b p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {hasActiveTasks ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{summary.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {summary.completedCount} complete{summary.failedCount > 0 ? `, ${summary.failedCount} failed` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{summary.status}</span>
            </div>
            <Progress value={summary.progress} className="h-1.5" />
          </div>
          <Button
            size="sm"
            variant="ghost"
            mode="icon"
            aria-label="Minimize uploads"
            onClick={() => setCollapsed(true)}
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[min(55vh,420px)] space-y-2 overflow-y-auto p-3">
        {tasks.map((task) => (
          <UploadTaskRow key={task.id} task={task} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 border-t p-3">
        <Button variant="outline" size="sm" onClick={cancelAll} disabled={!hasActiveTasks}>
          <XCircle className="size-3.5" />
          Cancel all
        </Button>
        <Button variant="outline" size="sm" onClick={clearTerminalUploads} disabled={!hasTerminalTasks}>
          <Trash2 className="size-3.5" />
          Clear finished
        </Button>
      </div>
    </div>
  );
}
