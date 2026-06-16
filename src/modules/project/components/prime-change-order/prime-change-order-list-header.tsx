import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Button } from '@/app/components/ui/button';
import { useAccess } from '@/app/contexts/access-context';
import { formatPrimeChangeOrderDateTime } from '@/modules/project/components/prime-change-order/prime-change-order-list-utils';
import type { PrimeChangeOrderSyncStatusResponse } from '@/modules/project/schemas/prime-change-order';
import { ExternalLink, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PrimeChangeOrderListHeaderProps {
  projectId: string;
  totalCount: number;
  hasActiveFilters: boolean;
  isMapped: boolean;
  fieldwireProjectName?: string | null;
  syncStatus?: PrimeChangeOrderSyncStatusResponse;
  isSyncDisabled: boolean;
  isSyncPending: boolean;
  onSync: () => void;
}

export function PrimeChangeOrderListHeader({
  projectId,
  totalCount,
  hasActiveFilters,
  isMapped,
  fieldwireProjectName,
  syncStatus,
  isSyncDisabled,
  isSyncPending,
  onSync,
}: PrimeChangeOrderListHeaderProps) {
  const { isAdmin } = useAccess();
  const fieldwireProjectLabel = fieldwireProjectName || syncStatus?.fieldwireProjectId || '-';

  return (
    <ResourcePageHeader
      title="Prime Change Orders"
      resultLabel="Prime Change Orders"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      description={
        <span className="text-sm text-muted-foreground">
          {isMapped
            ? `Fieldwire Project: ${fieldwireProjectLabel} | Last synced: ${formatPrimeChangeOrderDateTime(
                syncStatus?.syncStatus.lastSyncedAt
              )}`
            : 'No Fieldwire project mapped'}
        </span>
      }
      actions={
        <>
          {isAdmin && !isMapped && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/project/${projectId}/edit`}>Add Fieldwire Project</Link>
            </Button>
          )}
          {isMapped && syncStatus?.fieldwireProjectId && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://app.fieldwire.com/projects/${syncStatus.fieldwireProjectId}/change-orders`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" />
                Open in Fieldwire
              </a>
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" onClick={onSync} disabled={isSyncDisabled}>
              <RefreshCcw className={`size-4 ${isSyncPending ? 'animate-spin' : ''}`} />
              Sync Fieldwire
            </Button>
          )}
        </>
      }
    />
  );
}
