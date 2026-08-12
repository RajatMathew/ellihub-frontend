import { sharedMailboxesApi } from '@/modules/settings/api/shared-mailboxes.api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const sharedMailboxKeys = {
  all: ['settings', 'shared-mailboxes'] as const,
  vendorConnections: ['settings', 'shared-mailboxes', 'vendor-connections'] as const,
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

export const useConnectSharedMailboxMutation = () =>
  useMutation({
    mutationFn: sharedMailboxesApi.connect,
    onSuccess: (authorizationUrl) => {
      window.location.assign(authorizationUrl);
    },
    onError: () => toast.error('Failed to start common mailbox connection.'),
  });
