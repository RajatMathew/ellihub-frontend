import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { useBatchSyncStatusQuery } from '@/modules/settings/hooks/shared-mailboxes.hooks';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, LoaderCircle, X } from 'lucide-react';

import type { BatchSyncStatus } from '@/modules/settings/api/shared-mailboxes.api';

type Props = {
  accountIds: string[];
  onDismiss: () => void;
};

type DerivedStatus = 'syncing' | 'ready' | 'error';

const deriveStatus = (row: BatchSyncStatus): DerivedStatus => {
  if (row.lastSyncStatus === 'ERROR' || row.status === 'ERROR') return 'error';
  if (row.lastSyncStatus === 'READY') return 'ready';
  return 'syncing';
};

const estimateProgress = (row: BatchSyncStatus): number => {
  if (deriveStatus(row) === 'ready') return 100;
  if (row.folderCount === 0) return 8;
  const perFolderTarget = 50;
  const target = row.folderCount * perFolderTarget;
  return Math.min(95, 15 + Math.round((row.messageCount / Math.max(target, 1)) * 80));
};

export function SharedMailboxSyncPanel({ accountIds, onDismiss }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const query = useBatchSyncStatusQuery(accountIds, accountIds.length > 0);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const total = accountIds.length;
  const done = rows.filter((row) => deriveStatus(row) === 'ready').length;
  const failed = rows.filter((row) => deriveStatus(row) === 'error').length;
  const allSettled = rows.length === total && done + failed === total;

  useEffect(() => {
    if (allSettled && failed === 0) {
      const timer = window.setTimeout(onDismiss, 2_500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [allSettled, failed, onDismiss]);

  if (accountIds.length === 0) return null;

  return (
    <aside
      aria-live="polite"
      aria-label="Sync progress"
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-lg border border-border bg-background shadow-lg"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {allSettled
              ? failed > 0
                ? `Synced ${done} of ${total} with issues`
                : 'Sync complete'
              : `Syncing ${done} of ${total} mailboxes`}
          </p>
          {!allSettled && (
            <p className="text-xs text-muted-foreground">
              You can keep working while this finishes.
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            aria-label={collapsed ? 'Expand sync progress' : 'Collapse sync progress'}
            onClick={() => setCollapsed((prev) => !prev)}
          >
            {collapsed ? (
              <ChevronUp aria-hidden="true" className="size-4" />
            ) : (
              <ChevronDown aria-hidden="true" className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            mode="icon"
            aria-label="Dismiss sync progress"
            onClick={onDismiss}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </header>
      {!collapsed && (
        <ul className="max-h-80 overflow-y-auto divide-y divide-border">
          {accountIds.map((accountId) => {
            const row = rows.find((candidate) => candidate.accountId === accountId);
            return (
              <li key={accountId} className="px-4 py-3">
                <SyncRow row={row} accountId={accountId} />
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function SyncRow({ row, accountId }: { row?: BatchSyncStatus; accountId: string }) {
  if (!row) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        <span className="truncate">Preparing {accountId}…</span>
      </div>
    );
  }

  const derived = deriveStatus(row);
  const progress = estimateProgress(row);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.emailAddress}</p>
        </div>
        <StatusIcon status={derived} />
      </div>
      {derived !== 'ready' && (
        <Progress value={progress} className="h-1.5" />
      )}
      <p className="text-xs text-muted-foreground">
        {derived === 'error'
          ? row.lastSyncError || 'Sync failed. Retry from the mailbox.'
          : derived === 'ready'
            ? `${row.messageCount.toLocaleString()} messages · ${row.folderCount} folders`
            : `${row.messageCount.toLocaleString()} messages loaded · ${row.folderCount} folders`}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: DerivedStatus }) {
  if (status === 'ready') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-success-accent">
        <CheckCircle2 aria-hidden="true" className="size-4" />
        Ready
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-destructive">
        <AlertCircle aria-hidden="true" className="size-4" />
        Error
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      Syncing
    </span>
  );
}
