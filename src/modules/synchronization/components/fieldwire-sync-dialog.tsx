import { AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';

import { Alert, AlertContent, AlertDescription, AlertIcon } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Separator } from '@/app/components/ui/separator';
import {
  useFieldwireSyncStatusQuery,
  useSyncFieldwireMutation,
} from '@/modules/synchronization/hooks/synchronization.hooks';

type FieldwireSyncDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatSyncDate(value: string | null | undefined) {
  if (!value) return 'Never synced';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusVariant(status: string | null | undefined) {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'destructive';
  if (status === 'PARTIAL') return 'warning';
  return 'secondary';
}

export function FieldwireSyncDialog({ open, onOpenChange }: FieldwireSyncDialogProps) {
  const statusQuery = useFieldwireSyncStatusQuery(open);
  const syncMutation = useSyncFieldwireMutation();
  const overview = statusQuery.data;
  const failedProjects =
    overview?.projects.filter((project) => project.lastSyncStatus === 'FAILED') ?? [];

  function handleSync() {
    syncMutation.mutate(undefined, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !syncMutation.isPending && onOpenChange(nextOpen)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sync Fieldwire</DialogTitle>
          <DialogDescription>
            Sync Prime Change Orders from Fieldwire for all active projects mapped to Fieldwire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Active Projects
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {overview?.mappedProjectCount ?? '-'}
              </div>
            </div>
            <div className="rounded-md border p-3 sm:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Last Global Sync
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{formatSyncDate(overview?.lastSyncedAt)}</span>
                <Badge variant={getStatusVariant(overview?.lastSyncStatus)} appearance="light" size="sm">
                  {overview?.lastSyncStatus ?? 'Not synced'}
                </Badge>
              </div>
            </div>
          </div>

          {overview && overview.mappedProjectCount === 0 && (
            <Alert appearance="light">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertDescription>
                  No active projects are currently mapped to a Fieldwire project.
                </AlertDescription>
              </AlertContent>
            </Alert>
          )}

          {failedProjects.length > 0 && (
            <Alert variant="destructive" appearance="light">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertDescription>
                  Last sync failed for {failedProjects.length} project
                  {failedProjects.length === 1 ? '' : 's'}.
                </AlertDescription>
              </AlertContent>
            </Alert>
          )}

          <Separator />

          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Received: {overview?.totals.totalReceived ?? 0}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Created: {overview?.totals.createdCount ?? 0}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Updated: {overview?.totals.updatedCount ?? 0}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="size-4" />
              Deleted: {overview?.totals.deletedCount ?? 0}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSync}
            disabled={syncMutation.isPending || statusQuery.isLoading || overview?.mappedProjectCount === 0}
          >
            <RefreshCcw className={`size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
