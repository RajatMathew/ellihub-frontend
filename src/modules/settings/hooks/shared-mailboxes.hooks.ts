import { sharedMailboxesApi } from '@/modules/settings/api/shared-mailboxes.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const sharedMailboxKeys = {
  all: ['settings', 'shared-mailboxes'] as const,
  vendorConnections: ['settings', 'shared-mailboxes', 'vendor-connections'] as const,
  pendingDiscovery: (id: string | null) =>
    ['settings', 'shared-mailboxes', 'pending-discovery', id] as const,
  batchSyncStatus: (accountIds: string[]) =>
    ['settings', 'shared-mailboxes', 'batch-sync-status', [...accountIds].sort().join(',')] as const,
};

export const useSharedMailboxesQuery = (enabled = true) =>
  useQuery({
    queryKey: sharedMailboxKeys.all,
    queryFn: () => sharedMailboxesApi.list(),
    enabled,
  });

export const useVendorConnectionsQuery = (enabled = true) =>
  useQuery({
    queryKey: sharedMailboxKeys.vendorConnections,
    queryFn: () => sharedMailboxesApi.listVendorConnections(),
    enabled,
  });

export const useCreateSharedMailboxMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sharedMailboxesApi.create,
    onSuccess: () => {
      toast.success('Common mailbox created.');
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.all });
    },
    onError: () => toast.error('Failed to create common mailbox.'),
  });
};

export const useDiscoverSharedMailboxesMutation = () =>
  useMutation({
    mutationFn: sharedMailboxesApi.discover,
    onSuccess: (authorizationUrl) => {
      window.location.assign(authorizationUrl);
    },
    onError: () => toast.error('Failed to start vendor account connection.'),
  });

export const useDisconnectVendorConnectionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sharedMailboxesApi.disconnectVendorConnection,
    onSuccess: () => {
      toast.success('Vendor account disconnected.');
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.all });
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.vendorConnections });
      void queryClient.invalidateQueries({ queryKey: ['email', 'accounts'] });
    },
    onError: () => toast.error('Could not disconnect the vendor account. Try again.'),
  });
};

export const useRemoveVendorConnectionMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sharedMailboxesApi.removeVendorConnection,
    onSuccess: () => {
      toast.success('Disconnected vendor account removed.');
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.all });
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.vendorConnections });
      void queryClient.invalidateQueries({ queryKey: ['email', 'accounts'] });
    },
    onError: () => toast.error('Could not remove the vendor account. Try again.'),
  });
};

export const useRemoveSharedMailboxMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sharedMailboxesApi.removeSharedMailbox,
    onSuccess: () => {
      toast.success('Common mailbox removed from Elli.');
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['email', 'accounts'] });
    },
    onError: () => toast.error('Could not remove the common mailbox. Try again.'),
  });
};

export const useConnectSharedMailboxMutation = () =>
  useMutation({
    mutationFn: sharedMailboxesApi.connect,
    onSuccess: (authorizationUrl) => {
      window.location.assign(authorizationUrl);
    },
    onError: () => toast.error('Failed to start common mailbox connection.'),
  });

export const usePendingDiscoveryQuery = (pendingId: string | null) =>
  useQuery({
    queryKey: sharedMailboxKeys.pendingDiscovery(pendingId),
    queryFn: () => sharedMailboxesApi.getPendingDiscovery(pendingId!),
    enabled: !!pendingId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'discovering' ? 2_000 : false;
    },
    refetchOnWindowFocus: false,
    gcTime: 0,
  });

export const useConfirmPendingDiscoveryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pendingId, emailAddresses }: { pendingId: string; emailAddresses: string[] }) =>
      sharedMailboxesApi.confirmPendingDiscovery(pendingId, emailAddresses),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.all });
      void queryClient.invalidateQueries({ queryKey: sharedMailboxKeys.vendorConnections });
      void queryClient.invalidateQueries({ queryKey: ['connected-email', 'accounts'] });
    },
    onError: () => toast.error('Could not add the selected mailboxes. Try again.'),
  });
};

export const useCancelPendingDiscoveryMutation = () =>
  useMutation({
    mutationFn: sharedMailboxesApi.cancelPendingDiscovery,
  });

export const useBatchSyncStatusQuery = (accountIds: string[], enabled: boolean) =>
  useQuery({
    queryKey: sharedMailboxKeys.batchSyncStatus(accountIds),
    queryFn: () => sharedMailboxesApi.listBatchSyncStatus(accountIds),
    enabled: enabled && accountIds.length > 0,
    refetchInterval: (query) => {
      const anyInFlight = (query.state.data ?? []).some(
        (row) =>
          row.inFlight ||
          row.lastSyncStatus === 'SYNCING' ||
          row.lastSyncStatus === 'PARTIAL' ||
          row.lastSyncStatus === null
      );
      return anyInFlight ? 3_000 : false;
    },
    refetchOnWindowFocus: false,
  });
