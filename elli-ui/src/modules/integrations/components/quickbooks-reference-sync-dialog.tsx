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
  useQuickBooksReferenceSyncStatusQuery,
  useSyncQuickBooksReferenceDataMutation,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import { AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';

type QuickBooksReferenceSyncDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const entityLabels: Record<string, string> = {
  BANK_ACCOUNT: 'Bank Accounts',
  LINE_ITEM_CATEGORY: 'Line Item Categories',
  PAYEE: 'Payees',
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

export function QuickBooksReferenceSyncDialog({
  open,
  onOpenChange,
}: QuickBooksReferenceSyncDialogProps) {
  const statusQuery = useQuickBooksReferenceSyncStatusQuery(open);
  const syncMutation = useSyncQuickBooksReferenceDataMutation();
  const overview = statusQuery.data;
  const canSync = Boolean(overview?.connected) && !statusQuery.isLoading;

  function handleSync() {
    syncMutation.mutate(undefined, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !syncMutation.isPending && onOpenChange(nextOpen)}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Sync QuickBooks</DialogTitle>
          <DialogDescription>
            Sync bank accounts, expense categories, and vendors from QuickBooks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {statusQuery.isError && (
            <Alert variant="destructive" appearance="light">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertDescription>Unable to load QuickBooks sync status.</AlertDescription>
              </AlertContent>
            </Alert>
          )}

          {overview && !overview.connected && (
            <Alert appearance="light">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertDescription>
                  Connect QuickBooks before syncing reference data.
                </AlertDescription>
              </AlertContent>
            </Alert>
          )}

          {overview?.lastSyncError && (
            <Alert variant="destructive" appearance="light">
              <AlertIcon>
                <AlertCircle className="size-5" />
              </AlertIcon>
              <AlertContent>
                <AlertDescription>{overview.lastSyncError}</AlertDescription>
              </AlertContent>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Last Sync
              </div>
              <div className="mt-1 text-sm font-medium">
                {formatSyncDate(overview?.lastSyncedAt)}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Received
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {overview?.totals.totalReceived ?? '-'}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Daily Sync
              </div>
              <div className="mt-1">
                <Badge
                  variant={overview?.autoDailySyncEnabled ? 'success' : 'secondary'}
                  appearance="light"
                  size="sm"
                >
                  {overview?.autoDailySyncEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid gap-2 text-sm sm:grid-cols-3">
            {(overview?.entities ?? []).map((entity) => (
              <div key={entity.entity} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium">{entityLabels[entity.entity] ?? entity.entity}</div>
                  <Badge
                    variant={getStatusVariant(entity.lastSyncStatus)}
                    appearance="light"
                    size="sm"
                  >
                    {entity.lastSyncStatus ?? 'Not synced'}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5" />
                    Created {entity.createdCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5" />
                    Updated {entity.updatedCount}
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-3.5" />
                    Deleted {entity.deletedCount}
                  </div>
                </div>
              </div>
            ))}
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
          <Button type="button" onClick={handleSync} disabled={!canSync || syncMutation.isPending}>
            <RefreshCcw className={`size-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
