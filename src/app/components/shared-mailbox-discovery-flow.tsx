import { useEffect, useMemo, useRef, useState } from 'react';

import { SharedMailboxDiscoveryModal } from '@/modules/settings/components/shared-mailbox-discovery-modal';
import { SharedMailboxSyncPanel } from '@/modules/settings/components/shared-mailbox-sync-panel';
import {
  useCancelPendingDiscoveryMutation,
  useConfirmPendingDiscoveryMutation,
  usePendingDiscoveryQuery,
} from '@/modules/settings/hooks/shared-mailboxes.hooks';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const DISCOVERY_PARAM = 'discovery';
const SCOPE_PARAM = 'discoveryScope';
const VALID_SCOPES = new Set(['vendor', 'personal']);

export function SharedMailboxDiscoveryFlow() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawScope = searchParams.get(SCOPE_PARAM);
  const pendingId = searchParams.get(DISCOVERY_PARAM);
  const scope = rawScope && VALID_SCOPES.has(rawScope) ? (rawScope as 'vendor' | 'personal') : null;
  const activePendingId = scope && pendingId ? pendingId : null;

  const [syncAccountIds, setSyncAccountIds] = useState<string[]>([]);
  const clearedRef = useRef<string | null>(null);

  const pendingQuery = usePendingDiscoveryQuery(activePendingId);
  const confirmMutation = useConfirmPendingDiscoveryMutation();
  const cancelMutation = useCancelPendingDiscoveryMutation();

  const clearSearchParam = () => {
    if (!activePendingId) return;
    if (clearedRef.current === activePendingId) return;
    clearedRef.current = activePendingId;
    const next = new URLSearchParams(searchParams);
    next.delete(DISCOVERY_PARAM);
    next.delete(SCOPE_PARAM);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (activePendingId) {
      clearedRef.current = null;
    }
  }, [activePendingId]);

  const discovery = pendingQuery.data;

  const handleSkip = () => {
    if (!activePendingId) {
      clearSearchParam();
      return;
    }
    cancelMutation.mutate(activePendingId, {
      onSettled: () => clearSearchParam(),
    });
  };

  const handleConfirm = (emailAddresses: string[]) => {
    if (!activePendingId) return;
    confirmMutation.mutate(
      { pendingId: activePendingId, emailAddresses },
      {
        onSuccess: (result) => {
          if (result.provisionedAccountIds.length > 0) {
            setSyncAccountIds(result.provisionedAccountIds);
            const addedCount = result.provisioned;
            const skippedNote =
              result.skipped > 0
                ? ` ${result.skipped} were already in Common.`
                : '';
            toast.success(
              addedCount === 1
                ? `1 mailbox added. Syncing now.${skippedNote}`
                : `${addedCount} mailboxes added. Syncing now.${skippedNote}`
            );
          } else if (result.skipped > 0) {
            // Race: candidates were already in Common by the time we confirmed.
            // Treat as a friendly no-op rather than an error.
            toast.success("You're all set — those shared inboxes are already in Common.");
          }
          clearSearchParam();
        },
      }
    );
  };

  // Personal-scope discovery is opportunistic — the user asked to connect a
  // personal inbox, not to hunt for shared mailboxes. If nothing is available
  // or the provider rejects the directory scope, quietly skip so the user
  // never sees an error they can't act on.
  const personalScopeShouldAutoSkip =
    scope === 'personal' &&
    (pendingQuery.isError ||
      discovery?.status === 'error' ||
      (discovery?.status === 'ready' && discovery.candidates.length === 0));

  useEffect(() => {
    if (personalScopeShouldAutoSkip) handleSkip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalScopeShouldAutoSkip]);

  // Personal-scope discovery auto-skips the instant it resolves to no
  // candidates (the common case) or an error, which is near-instant on a
  // fast connection — opening the modal first and closing it right after
  // just reads as a meaningless flash. Wait until there's something to
  // actually confirm before showing it for this scope. Vendor scope has no
  // auto-skip and legitimately wants its own loading state, so it still
  // opens immediately.
  const personalScopeHasCandidates =
    scope === 'personal' && discovery?.status === 'ready' && discovery.candidates.length > 0;
  const modalOpen = useMemo(() => {
    if (!activePendingId || !scope || personalScopeShouldAutoSkip) return false;
    return scope === 'personal' ? personalScopeHasCandidates : true;
  }, [activePendingId, scope, personalScopeShouldAutoSkip, personalScopeHasCandidates]);

  return (
    <>
      {modalOpen && scope ? (
        <SharedMailboxDiscoveryModal
          open={modalOpen}
          scope={scope}
          discovery={pendingQuery.data}
          isLoading={pendingQuery.isLoading}
          isError={pendingQuery.isError}
          isConfirming={confirmMutation.isPending}
          onConfirm={handleConfirm}
          onSkip={handleSkip}
          onDismiss={handleSkip}
        />
      ) : null}
      {syncAccountIds.length > 0 ? (
        <SharedMailboxSyncPanel
          accountIds={syncAccountIds}
          onDismiss={() => setSyncAccountIds([])}
        />
      ) : null}
    </>
  );
}
