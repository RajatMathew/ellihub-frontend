import { AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';

import { Alert, AlertContent, AlertDescription, AlertIcon } from '@/app/components/ui/alert';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
  CardToolbar,
} from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { Switch } from '@/app/components/ui/switch';
import type { QuickBooksReferenceSyncStatus } from '@/modules/integrations/schemas/quickbooks.schema';

type QuickBooksReferenceSyncCardProps = {
  status: QuickBooksReferenceSyncStatus;
  canSync: boolean;
  canManage: boolean;
  isSyncing: boolean;
  isUpdatingAutoDailySync: boolean;
  onSync: () => void;
  onToggleAutoDailySync: (enabled: boolean) => void;
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

export function QuickBooksReferenceSyncCard({
  status,
  canSync,
  canManage,
  isSyncing,
  isUpdatingAutoDailySync,
  onSync,
  onToggleAutoDailySync,
}: QuickBooksReferenceSyncCardProps) {
  const syncDisabled = !status.connected || !canSync || isSyncing || isUpdatingAutoDailySync;
  const toggleDisabled = !status.connected || !canManage || isSyncing || isUpdatingAutoDailySync;

  return (
    <Card>
      <CardHeader>
        <CardHeading>
          <CardTitle>Reference Data Sync</CardTitle>
          <CardDescription>QuickBooks bank accounts, line item categories, and payees</CardDescription>
        </CardHeading>
        <CardToolbar className="flex-wrap">
          <Badge variant={getStatusVariant(status.lastSyncStatus)} appearance="light">
            {status.lastSyncStatus ?? 'Not synced'}
          </Badge>
          <Button size="sm" onClick={onSync} disabled={syncDisabled}>
            <RefreshCcw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardContent className="space-y-5">
        {!status.connected && (
          <Alert appearance="light">
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertDescription>Connect QuickBooks before syncing reference data.</AlertDescription>
            </AlertContent>
          </Alert>
        )}

        {status.lastSyncError && (
          <Alert variant="destructive" appearance="light">
            <AlertIcon>
              <AlertCircle className="size-5" />
            </AlertIcon>
            <AlertContent>
              <AlertDescription>{status.lastSyncError}</AlertDescription>
            </AlertContent>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Last Sync
            </div>
            <div className="mt-1 text-sm font-medium">{formatSyncDate(status.lastSyncedAt)}</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Received
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">
              {status.totals.totalReceived}
            </div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Auto Daily Sync
            </div>
            <div className="mt-2">
              <Switch
                size="sm"
                checked={status.autoDailySyncEnabled}
                disabled={toggleDisabled}
                onCheckedChange={onToggleAutoDailySync}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-2 text-sm md:grid-cols-3">
          {status.entities.map((entity) => (
            <div key={entity.entity} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{entityLabels[entity.entity] ?? entity.entity}</div>
                <Badge variant={getStatusVariant(entity.lastSyncStatus)} appearance="light" size="sm">
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
      </CardContent>
    </Card>
  );
}
