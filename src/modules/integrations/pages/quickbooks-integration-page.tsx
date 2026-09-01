import { useEffect } from 'react';

import { ListPageHeader, PageHeaderSkeleton } from '@/app/components/page-header';
import { QueryErrorState } from '@/app/components/query-error-state';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import { QuickBooksReferenceSyncCard } from '@/modules/integrations/components/quickbooks-reference-sync-card';
import { QuickBooksStatusCard } from '@/modules/integrations/components/quickbooks-status-card';
import {
  useDisconnectQuickBooksMutation,
  useQuickBooksReferenceSyncStatusQuery,
  useQuickBooksStatusQuery,
  useStartQuickBooksConnectionMutation,
  useSyncQuickBooksReferenceDataMutation,
  useUpdateQuickBooksReferenceAutoDailySyncMutation,
} from '@/modules/integrations/hooks/quickbooks.hooks';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

function QuickBooksPageLoading() {
  return (
    <div className="container-fluid space-y-4 py-7.5">
      <PageHeaderSkeleton actionCount={0} showDescription={false} showEyebrow />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function QuickBooksIntegrationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useAccess();
  const statusQuery = useQuickBooksStatusQuery();
  const referenceSyncStatusQuery = useQuickBooksReferenceSyncStatusQuery();
  const startConnection = useStartQuickBooksConnectionMutation();
  const disconnect = useDisconnectQuickBooksMutation();
  const syncReferenceData = useSyncQuickBooksReferenceDataMutation();
  const updateAutoDailySync = useUpdateQuickBooksReferenceAutoDailySyncMutation();
  const canSyncReferenceData = can('integration', 'sync');
  const canManageIntegrations = can('integration', 'manage');

  useEffect(() => {
    const result = searchParams.get('quickbooks');
    if (!result) return;

    if (result === 'connected') {
      toast.success('QuickBooks connected.');
      void statusQuery.refetch();
      void referenceSyncStatusQuery.refetch();
    }

    if (result === 'disconnected') {
      toast.info('QuickBooks has been disconnected.');
      void statusQuery.refetch();
      void referenceSyncStatusQuery.refetch();
    }

    if (result === 'error') {
      toast.error(searchParams.get('reason') ?? 'QuickBooks connection failed.');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('quickbooks');
    next.delete('reason');
    next.delete('realmId');
    setSearchParams(next, { replace: true });
  }, [referenceSyncStatusQuery, searchParams, setSearchParams, statusQuery]);

  if (statusQuery.isLoading) {
    return <QuickBooksPageLoading />;
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <div className="container-fluid py-7.5">
        <QueryErrorState
          title="Unable to load integrations"
          onRetry={() => void statusQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container-fluid space-y-4 py-7.5">
      <ListPageHeader eyebrow="Settings" title="Integrations" />

      <QuickBooksStatusCard
        status={statusQuery.data}
        isConnecting={startConnection.isPending}
        isDisconnecting={disconnect.isPending}
        onConnect={() => startConnection.mutate()}
        onDisconnect={() => disconnect.mutate()}
      />

      {referenceSyncStatusQuery.isLoading ? (
        <Skeleton className="h-72 w-full" />
      ) : referenceSyncStatusQuery.isError || !referenceSyncStatusQuery.data ? (
        <QueryErrorState
          title="Unable to load QuickBooks sync status"
          onRetry={() => void referenceSyncStatusQuery.refetch()}
        />
      ) : (
        <QuickBooksReferenceSyncCard
          status={referenceSyncStatusQuery.data}
          canSync={canSyncReferenceData}
          canManage={canManageIntegrations}
          isSyncing={syncReferenceData.isPending}
          isUpdatingAutoDailySync={updateAutoDailySync.isPending}
          onSync={() => syncReferenceData.mutate()}
          onToggleAutoDailySync={(enabled) => updateAutoDailySync.mutate(enabled)}
        />
      )}
    </div>
  );
}
