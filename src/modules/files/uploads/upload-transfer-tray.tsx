import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import { ProgressCircle } from '@/app/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { type UploadTask } from '@/modules/files/uploads/upload-manager';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

type UploadSummary = {
  activeCount: number;
  failedCount: number;
  completedCount: number;
  cancelledCount: number;
  terminalCount: number;
  progress: number;
  title: string;
  status: string;
};

const COMPLETED_UPLOADS_DISMISS_DELAY_MS = 10_000;

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

function getTaskStatusIcon(task: UploadTask) {
  if (task.status === 'completed') return <CheckCircle2 className="size-3.5 text-success" />;
  if (task.status === 'failed') return <AlertCircle className="size-3.5 text-destructive" />;
  if (task.status === 'cancelled') return <XCircle className="size-3.5 text-muted-foreground" />;
  return <Loader2 className="size-3.5 animate-spin text-primary" />;
}

function getProgressIndicatorClassName(summary: UploadSummary): string {
  if (summary.failedCount > 0) return 'text-destructive';
  if (summary.activeCount === 0 && summary.completedCount > 0) return 'text-success';
  return 'text-primary';
}

function getHeaderProgressIndicatorClassName(summary: UploadSummary): string {
  if (summary.failedCount > 0) return 'text-destructive-foreground';
  return 'text-primary-foreground';
}

function getSummary(tasks: UploadTask[]): UploadSummary {
  const activeCount = tasks.filter(isActive).length;
  const failedCount = tasks.filter((task) => task.status === 'failed').length;
  const completedCount = tasks.filter((task) => task.status === 'completed').length;
  const cancelledCount = tasks.filter((task) => task.status === 'cancelled').length;
  const terminalCount = tasks.length - activeCount;
  const totalBytes = tasks.reduce((sum, task) => sum + Math.max(task.totalBytes, task.fileSize), 0);
  const uploadedBytes = tasks.reduce((sum, task) => {
    if (task.status === 'completed') return sum + Math.max(task.totalBytes, task.fileSize);
    return sum + task.uploadedBytes;
  }, 0);
  const progress =
    totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;

  if (activeCount > 0) {
    return {
      activeCount,
      failedCount,
      completedCount,
      cancelledCount,
      terminalCount,
      progress,
      title: activeCount === 1 ? 'Uploading 1 item' : `Uploading ${activeCount} items`,
      status: `${progress}%`,
    };
  }

  if (failedCount > 0) {
    return {
      activeCount,
      failedCount,
      completedCount,
      cancelledCount,
      terminalCount,
      progress,
      title: failedCount === 1 ? 'Upload failed' : `${failedCount} uploads failed`,
      status: 'Needs review',
    };
  }

  if (cancelledCount > 0 && completedCount === 0) {
    return {
      activeCount,
      failedCount,
      completedCount,
      cancelledCount,
      terminalCount,
      progress,
      title: cancelledCount === 1 ? 'Upload cancelled' : `${cancelledCount} uploads cancelled`,
      status: 'Cancelled',
    };
  }

  return {
    activeCount,
    failedCount,
    completedCount,
    cancelledCount,
    terminalCount,
    progress: 100,
    title: completedCount === 1 ? 'Upload complete' : `${completedCount} uploads complete`,
    status: 'Complete',
  };
}

function getSummaryDetail(summary: UploadSummary): string {
  const details: string[] = [];
  if (summary.activeCount > 0) {
    details.push(
      summary.activeCount === 1
        ? '1 upload in progress'
        : `${summary.activeCount} uploads in progress`
    );
  }
  if (summary.completedCount > 0) {
    details.push(
      summary.completedCount === 1 ? '1 file uploaded' : `${summary.completedCount} files uploaded`
    );
  }
  if (summary.failedCount > 0) {
    details.push(
      summary.failedCount === 1 ? '1 upload failed' : `${summary.failedCount} uploads failed`
    );
  }
  if (summary.cancelledCount > 0) {
    details.push(
      summary.cancelledCount === 1
        ? '1 upload cancelled'
        : `${summary.cancelledCount} uploads cancelled`
    );
  }
  return details.join(', ');
}

function getDismissTerminalLabel(summary: UploadSummary): string {
  const labels: string[] = [];
  if (summary.completedCount > 0) labels.push('completed');
  if (summary.failedCount > 0) labels.push('failed');
  if (summary.cancelledCount > 0) labels.push('cancelled');

  if (labels.length === 0) return 'Dismiss uploads';
  if (labels.length === 1) return `Dismiss ${labels[0]}`;
  if (labels.length === 2) return `Dismiss ${labels.join(' and ')}`;
  return `Dismiss ${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function shouldShowSummaryStatus(summary: UploadSummary): boolean {
  return summary.activeCount > 0 || summary.failedCount > 0 || summary.cancelledCount > 0;
}

function getTaskDetail(task: UploadTask, transferred: number): string {
  const total = task.totalBytes || task.fileSize;
  const label = task.label ?? task.fileName;

  if (task.status === 'completed') return `${label} · ${formatBytes(total)}`;
  return `${label} · ${formatBytes(transferred)} / ${formatBytes(total)}`;
}

function UploadTaskRow({ task }: { task: UploadTask }) {
  const { cancelUpload, clearUpload, retryUpload } = useUploadManager();
  const transferred = task.status === 'completed' ? task.totalBytes : task.uploadedBytes;
  const taskDetail = getTaskDetail(task, transferred);
  const isComplete = task.status === 'completed';
  const isFailed = task.status === 'failed';
  const isCancelled = task.status === 'cancelled';

  return (
    <div className="group flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/20">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/30">
        <FileTypeIcon fileType="FILE" fileName={task.fileName} className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-5 text-foreground">{task.displayName}</p>
        <p className="truncate text-xs leading-4 text-muted-foreground">{taskDetail}</p>
        {task.error && (
          <p className="mt-1 line-clamp-2 text-xs text-destructive">
            {task.failureStage === 'finalizing'
              ? `${task.error} The file may already be uploaded; attach it again from the page if needed.`
              : task.error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {canRetry(task) && (
          <Button
            size="sm"
            variant="ghost"
            mode="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            aria-label="Retry upload"
            onClick={() => retryUpload(task.id)}
          >
            <RotateCcw className="size-3.5" />
          </Button>
        )}
        {canCancel(task) && (
          <Button
            size="sm"
            variant="ghost"
            mode="icon"
            className="size-7 text-muted-foreground hover:text-foreground"
            aria-label="Cancel upload"
            onClick={() => cancelUpload(task.id)}
          >
            <XCircle className="size-3.5" />
          </Button>
        )}
        {isActive(task) ? (
          <ProgressCircle
            value={task.progress}
            size={28}
            strokeWidth={3}
            trackClassName="text-muted"
            indicatorClassName="text-primary"
          />
        ) : isComplete ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                mode="icon"
                className="size-8 rounded-full border border-success-alpha/80 bg-success-soft text-success transition-colors hover:border-destructive-alpha hover:bg-destructive-soft hover:text-destructive"
                aria-label={`Delete ${task.displayName}`}
                onClick={() => clearUpload(task.id)}
              >
                <CheckCircle2 className="size-4 group-hover:hidden" />
                <X className="hidden size-4 group-hover:block" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete file</TooltipContent>
          </Tooltip>
        ) : (
          <span
            className={cn(
              'flex size-7 items-center justify-center',
              isFailed && 'text-destructive',
              isCancelled && 'text-muted-foreground'
            )}
          >
            {getTaskStatusIcon(task)}
          </span>
        )}
        {!isActive(task) && !isComplete && (
          <Button
            size="sm"
            variant="ghost"
            mode="icon"
            className="size-7 text-muted-foreground opacity-60 transition-opacity hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            aria-label={`Dismiss ${task.displayName}`}
            onClick={() => clearUpload(task.id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function UploadSummaryProgress({ summary }: { summary: UploadSummary }) {
  if (
    summary.activeCount === 0 &&
    summary.completedCount > 0 &&
    summary.failedCount === 0 &&
    summary.cancelledCount === 0
  ) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckCircle2 className="size-4" />
      </div>
    );
  }

  if (summary.failedCount > 0 && summary.activeCount === 0) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive-soft text-destructive">
        <AlertCircle className="size-4" />
      </div>
    );
  }

  if (summary.cancelledCount > 0 && summary.completedCount === 0 && summary.activeCount === 0) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <XCircle className="size-4" />
      </div>
    );
  }

  return (
    <ProgressCircle
      value={summary.progress}
      size={32}
      strokeWidth={3}
      trackClassName="text-muted"
      indicatorClassName={getProgressIndicatorClassName(summary)}
    >
      {summary.activeCount > 0 && (
        <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
          {summary.progress}
        </span>
      )}
    </ProgressCircle>
  );
}

function UploadHeaderProgress({ summary }: { summary: UploadSummary }) {
  if (
    summary.activeCount === 0 &&
    summary.completedCount > 0 &&
    summary.failedCount === 0 &&
    summary.cancelledCount === 0
  ) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/12 text-primary-foreground">
        <CheckCircle2 className="size-4" />
      </div>
    );
  }

  if (summary.failedCount > 0 && summary.activeCount === 0) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/12 text-primary-foreground">
        <AlertCircle className="size-4" />
      </div>
    );
  }

  if (summary.cancelledCount > 0 && summary.completedCount === 0 && summary.activeCount === 0) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/12 text-primary-foreground/80">
        <XCircle className="size-4" />
      </div>
    );
  }

  return (
    <ProgressCircle
      value={summary.progress}
      size={32}
      strokeWidth={3}
      trackClassName="text-primary-foreground/25"
      indicatorClassName={getHeaderProgressIndicatorClassName(summary)}
    >
      {summary.activeCount > 0 && (
        <span className="text-[10px] font-semibold tabular-nums text-primary-foreground/90">
          {summary.progress}
        </span>
      )}
    </ProgressCircle>
  );
}

function UploadTrayActions({
  hasActiveTasks,
  hasTerminalTasks,
  cancelAll,
  clearTerminalUploads,
  dismissTerminalLabel,
}: {
  hasActiveTasks: boolean;
  hasTerminalTasks: boolean;
  cancelAll: () => void;
  clearTerminalUploads: () => void;
  dismissTerminalLabel: string;
}) {
  if (!hasActiveTasks && !hasTerminalTasks) return null;

  return (
    <div className="flex items-center justify-end gap-1.5 border-t border-border/70 bg-card px-2.5 py-1.5">
      {hasActiveTasks && (
        <Button variant="dim" size="sm" className="h-7 px-2 text-xs" onClick={cancelAll}>
          Cancel all
        </Button>
      )}
      {hasTerminalTasks && (
        <Button variant="dim" size="sm" className="h-7 px-2 text-xs" onClick={clearTerminalUploads}>
          {dismissTerminalLabel}
        </Button>
      )}
    </div>
  );
}

export function UploadTransferTray() {
  const { tasks, open, collapsed, cancelAll, clearTerminalUploads, setCollapsed } =
    useUploadManager();

  const summary = getSummary(tasks);
  const areAllUploadsCompleted =
    tasks.length > 0 &&
    summary.activeCount === 0 &&
    summary.completedCount === tasks.length &&
    summary.failedCount === 0 &&
    summary.cancelledCount === 0;

  useEffect(() => {
    if (!areAllUploadsCompleted) return;

    const timeoutId = window.setTimeout(() => {
      clearTerminalUploads();
    }, COMPLETED_UPLOADS_DISMISS_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [areAllUploadsCompleted, clearTerminalUploads]);

  if (!open || tasks.length === 0) return null;

  const hasActiveTasks = summary.activeCount > 0;
  const hasTerminalTasks = summary.terminalCount > 0;
  const summaryDetail = getSummaryDetail(summary);
  const dismissTerminalLabel = getDismissTerminalLabel(summary);
  const showSummaryStatus = shouldShowSummaryStatus(summary);

  if (collapsed) {
    return (
      <div
        className="fixed inset-x-4 bottom-4 z-50 rounded-md border bg-card p-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.08)] sm:left-auto sm:right-6 sm:w-[360px]"
        aria-live="polite"
      >
        <button
          type="button"
          className="flex w-full items-center gap-2.5 text-left"
          onClick={() => setCollapsed(false)}
          aria-label="Expand uploads"
        >
          <UploadSummaryProgress summary={summary} />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-foreground">{summary.title}</p>
              {showSummaryStatus && (
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {summary.status}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{summaryDetail}</p>
          </div>
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 overflow-hidden rounded-md border border-border/70 bg-card shadow-[0_16px_40px_rgba(15,23,42,0.14),0_4px_12px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
      aria-live="polite"
    >
      <div className="bg-primary px-3.5 py-3 text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <UploadHeaderProgress summary={summary} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-sm font-semibold text-primary-foreground">
                {summary.title}
              </p>
              {showSummaryStatus && (
                <span className="shrink-0 text-[11px] font-medium text-primary-foreground/75">
                  {summary.status}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-primary-foreground/75">{summaryDetail}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            mode="icon"
            className="size-7 text-primary-foreground/75 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            aria-label="Minimize uploads"
            onClick={() => setCollapsed(true)}
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[min(50vh,320px)] divide-y divide-border/70 overflow-y-auto">
        {tasks.map((task) => (
          <UploadTaskRow key={task.id} task={task} />
        ))}
      </div>

      <UploadTrayActions
        hasActiveTasks={hasActiveTasks}
        hasTerminalTasks={hasTerminalTasks}
        cancelAll={cancelAll}
        clearTerminalUploads={clearTerminalUploads}
        dismissTerminalLabel={dismissTerminalLabel}
      />
    </div>
  );
}
