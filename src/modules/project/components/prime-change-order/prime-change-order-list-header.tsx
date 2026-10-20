import { ListPageHeader } from '@/app/components/page-header';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import { formatPrimeChangeOrderDateTime } from '@/modules/project/components/prime-change-order/prime-change-order-list-utils';
import type { PrimeChangeOrderSyncStatusResponse } from '@/modules/project/schemas/prime-change-order';
import { ExternalLink, RefreshCcw } from 'lucide-react';

interface PrimeChangeOrderListHeaderProps {
  projectId: string;
  totalCount: number;
  hasActiveFilters: boolean;
  isLoading?: boolean;
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
  isLoading,
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
    <ListPageHeader
      title="Prime Change Orders"
      summary={{ total: totalCount, filtered: hasActiveFilters, label: 'Prime Change Orders' }}
      description={
        isLoading ? (
          <Skeleton className="h-4 w-56" />
        ) : (
          <span className="text-sm text-muted-foreground">
            {isMapped
              ? `Fieldwire Project: ${fieldwireProjectLabel} | Last synced: ${formatPrimeChangeOrderDateTime(
                  syncStatus?.syncStatus.lastSyncedAt
                )}`
              : 'No Fieldwire project mapped'}
          </span>
        )
      }
      // Fieldwire is an external destination, which the router-bound `to` on an
      // action cannot express.
      leadingActions={
        isMapped && syncStatus?.fieldwireProjectId ? (
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
        ) : null
      }
      actions={[
        {
          label: 'Add Fieldwire Project',
          to: `/app/project/${projectId}/edit`,
          enabled: isAdmin && !isMapped,
        },
        {
          label: 'Sync Fieldwire',
          icon: RefreshCcw,
          placement: 'primary',
          onClick: onSync,
          disabled: isSyncDisabled,
          pending: isSyncPending,
          enabled: isAdmin,
        },
      ]}
    />
  );
}
