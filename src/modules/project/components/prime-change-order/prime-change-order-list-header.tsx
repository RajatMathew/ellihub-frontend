import { ExternalLink, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/app/components/ui/button';
import { ProjectSectionHeader } from '@/modules/project/components/shared';
import {
  formatPrimeChangeOrderDateTime,
} from '@/modules/project/components/prime-change-order/prime-change-order-list-utils';
import type { PrimeChangeOrderSyncStatusResponse } from '@/modules/project/schemas/prime-change-order';

interface PrimeChangeOrderListHeaderProps {
  projectId: string;
  totalCount: number;
  hasActiveFilters: boolean;
  isMapped: boolean;
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
  syncStatus,
  isSyncDisabled,
  isSyncPending,
  onSync,
}: PrimeChangeOrderListHeaderProps) {
  return (
    <ProjectSectionHeader
      title="Prime Change Orders"
      resultLabel="Prime Change Orders"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      description={
        <span className="text-sm text-muted-foreground">
          {isMapped
            ? `Fieldwire Project: ${syncStatus?.fieldwireProjectId ?? '-'} | Last synced: ${formatPrimeChangeOrderDateTime(
                syncStatus?.syncStatus.lastSyncedAt,
              )}`
            : 'No Fieldwire project mapped'}
        </span>
      }
      actions={
        <>
          {!isMapped && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/app/project/${projectId}/edit`}>Add Fieldwire ID</Link>
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
          <Button size="sm" onClick={onSync} disabled={isSyncDisabled}>
            <RefreshCcw className={`size-4 ${isSyncPending ? 'animate-spin' : ''}`} />
            Sync Fieldwire
          </Button>
        </>
      }
    />
  );
}
