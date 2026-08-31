import { useState } from 'react';

import { useSession } from '@/app/api';
import { ListPageHeader } from '@/app/components/page-header';
import { SharedMailboxDiscoveryFlow } from '@/app/components/shared-mailbox-discovery-flow';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import { sharedMailboxesApi } from '@/modules/settings/api/shared-mailboxes.api';
import {
  useDisconnectVendorConnectionMutation,
  useDiscoverSharedMailboxesMutation,
  useRemoveSharedMailboxMutation,
  useRemoveVendorConnectionMutation,
  useSharedMailboxesQuery,
  useVendorConnectionsQuery,
} from '@/modules/settings/hooks/shared-mailboxes.hooks';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Mail, Plus, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

export function SharedMailboxesPage() {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: isAccessLoading } = useAccess();
  const { data: sessionData, isPending: isSessionPending } = useSession();
  const isSharedMailboxAdmin =
    isAdmin && sessionData?.user.email?.trim().toLowerCase() === 'admin@elli.com';
  const mailboxesQuery = useSharedMailboxesQuery(isSharedMailboxAdmin);
  const vendorConnectionsQuery = useVendorConnectionsQuery(isSharedMailboxAdmin);
  const discoverMutation = useDiscoverSharedMailboxesMutation();
  const disconnectMutation = useDisconnectVendorConnectionMutation();
  const removeVendorMutation = useRemoveVendorConnectionMutation();
  const removeMailboxMutation = useRemoveSharedMailboxMutation();
  const [disconnectTarget, setDisconnectTarget] = useState<{
    id: string;
    emailAddress: string;
  } | null>(null);
  const [removeVendorTarget, setRemoveVendorTarget] = useState<{
    id: string;
    emailAddress: string;
  } | null>(null);
  const [removeMailboxTarget, setRemoveMailboxTarget] = useState<{
    id: string;
    displayName: string;
    emailAddress: string;
  } | null>(null);
  const [selectedMailboxIds, setSelectedMailboxIds] = useState<Set<string>>(new Set());
  const [bulkRemoveOpen, setBulkRemoveOpen] = useState(false);
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);

  if (
    isAccessLoading ||
    isSessionPending ||
    (isSharedMailboxAdmin && (mailboxesQuery.isLoading || vendorConnectionsQuery.isLoading))
  ) {
    return (
      <>
        <SharedMailboxDiscoveryFlow />
        <div className="container-fluid space-y-5 py-7.5">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    );
  }

  if (!isSharedMailboxAdmin) {
    return (
      <main className="container-fluid py-7.5">
        <ListPageHeader eyebrow="Organization email" title="Common inboxes" />
        <section className="mt-6 max-w-xl rounded-lg border border-border bg-background p-5">
          <h2 className="text-base font-semibold text-foreground">Common inbox administration</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Only admin@elli.com can connect or manage the hidden Microsoft vendor accounts that keep
            common inboxes available to everyone.
          </p>
        </section>
      </main>
    );
  }

  const hasError = mailboxesQuery.isError || vendorConnectionsQuery.isError;
  if (hasError) {
    return (
      <>
        <SharedMailboxDiscoveryFlow />
        <main className="container-fluid py-7.5">
          <ListPageHeader eyebrow="Organization email" title="Common inboxes" />
          <section className="mt-6 flex max-w-xl flex-col items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-5">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle aria-hidden="true" className="size-4" />
              <h2 className="text-sm font-semibold">Couldn&apos;t load common inboxes</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This may be a temporary connection issue. Try again before reconnecting a vendor.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void mailboxesQuery.refetch();
                void vendorConnectionsQuery.refetch();
              }}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Try again
            </Button>
          </section>
        </main>
      </>
    );
  }

  const mailboxes = mailboxesQuery.data ?? [];
  const vendorConnections = vendorConnectionsQuery.data ?? [];
  const mailboxIds = mailboxes.map((mailbox) => mailbox.id);
  const validSelectedIds = Array.from(selectedMailboxIds).filter((id) => mailboxIds.includes(id));
  const allSelected = mailboxes.length > 0 && validSelectedIds.length === mailboxes.length;
  const someSelected = validSelectedIds.length > 0 && !allSelected;

  const toggleMailboxSelection = (id: string) => {
    setSelectedMailboxIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedMailboxIds(new Set());
    } else {
      setSelectedMailboxIds(new Set(mailboxIds));
    }
  };

  return (
    <>
      <SharedMailboxDiscoveryFlow />
      <main className="container-fluid space-y-7 py-7.5">
        <ListPageHeader
          eyebrow="Organization email"
          title="Common inboxes"
          description={
            <span className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Connect Microsoft vendor accounts to discover the shared mailboxes they can access.
              Elli merges the same mailbox automatically, so everyone sees one inbox.
            </span>
          }
          actions={[
            {
              label: discoverMutation.isPending ? 'Connecting...' : 'Connect vendor account',
              icon: discoverMutation.isPending ? RefreshCw : Plus,
              placement: 'primary',
              pending: discoverMutation.isPending,
              disabled: discoverMutation.isPending,
              onClick: () => discoverMutation.mutate(),
            },
          ]}
        />

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users aria-hidden="true" className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Vendor accounts</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {vendorConnections.filter((connection) => connection.status === 'CONNECTED').length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Sources connected to this organization
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail aria-hidden="true" className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Common inboxes</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{mailboxes.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Duplicates merged by mailbox address
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-background">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Connected vendor accounts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Add another account whenever a team needs coverage from a different Microsoft tenant
              or user.
            </p>
          </div>
          {vendorConnections.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <Users aria-hidden="true" className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No vendor accounts connected</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Connect the first Microsoft account to discover the shared mailboxes available to
                your organization.
              </p>
              <Button type="button" variant="outline" onClick={() => discoverMutation.mutate()}>
                <Plus aria-hidden="true" className="size-4" />
                Connect first account
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {vendorConnections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {connection.displayName || connection.emailAddress}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {connection.emailAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {connection.sharedMailboxCount}{' '}
                      {connection.sharedMailboxCount === 1 ? 'inbox' : 'inboxes'}
                    </span>
                    <Badge
                      variant={connection.status === 'CONNECTED' ? 'success' : 'warning'}
                      appearance="light"
                    >
                      {connection.status === 'CONNECTED'
                        ? 'Connected'
                        : connection.status.toLowerCase()}
                    </Badge>
                    {connection.status === 'CONNECTED' ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10"
                        onClick={() =>
                          setDisconnectTarget({
                            id: connection.id,
                            emailAddress: connection.emailAddress,
                          })
                        }
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10 text-destructive hover:text-destructive"
                        onClick={() =>
                          setRemoveVendorTarget({
                            id: connection.id,
                            emailAddress: connection.emailAddress,
                          })
                        }
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-border bg-background">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Shared mailboxes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each address appears once, even when multiple vendor accounts provide access.
              </p>
            </div>
            {mailboxes.length > 0 && (
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    aria-label={allSelected ? 'Deselect all mailboxes' : 'Select all mailboxes'}
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    disabled={isBulkRemoving}
                  />
                  {validSelectedIds.length > 0
                    ? `${validSelectedIds.length} of ${mailboxes.length} selected`
                    : 'Select all'}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 text-destructive hover:text-destructive"
                  disabled={validSelectedIds.length === 0 || isBulkRemoving}
                  onClick={() => setBulkRemoveOpen(true)}
                >
                  Remove selected
                </Button>
              </div>
            )}
          </div>
          {mailboxes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
              <Mail aria-hidden="true" className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                No shared mailboxes discovered yet
              </p>
              <p className="text-sm text-muted-foreground">
                Connect a vendor account to begin discovery.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {mailboxes.map((mailbox) => {
                const isConnected = mailbox.status === 'CONNECTED' && mailbox.sourceCount > 0;
                const isSelected = selectedMailboxIds.has(mailbox.id);
                const rowCheckboxId = `shared-mailbox-select-${mailbox.id}`;
                return (
                  <article
                    key={mailbox.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Checkbox
                        id={rowCheckboxId}
                        aria-label={`Select ${mailbox.displayName}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleMailboxSelection(mailbox.id)}
                        disabled={isBulkRemoving}
                      />
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                        <Mail aria-hidden="true" className="size-5 text-muted-foreground" />
                      </span>
                      <label htmlFor={rowCheckboxId} className="min-w-0 cursor-pointer">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {mailbox.displayName}
                        </h3>
                        <p className="truncate text-sm text-muted-foreground">
                          {mailbox.emailAddress}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Available through {mailbox.sourceCount}{' '}
                          {mailbox.sourceCount === 1 ? 'vendor account' : 'vendor accounts'}
                        </p>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge variant={isConnected ? 'success' : 'warning'} appearance="light">
                        {isConnected ? 'Ready for everyone' : 'Needs attention'}
                      </Badge>
                      {isConnected && (
                        <CheckCircle2 aria-hidden="true" className="size-4 text-success-accent" />
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-10 text-destructive hover:text-destructive"
                        disabled={isBulkRemoving}
                        onClick={() =>
                          setRemoveMailboxTarget({
                            id: mailbox.id,
                            displayName: mailbox.displayName,
                            emailAddress: mailbox.emailAddress,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <ConfirmDialog
          open={disconnectTarget !== null}
          onOpenChange={(open) => !open && setDisconnectTarget(null)}
          title="Disconnect vendor account?"
          description={
            disconnectTarget
              ? `Disconnecting ${disconnectTarget.emailAddress} stops access through this vendor account. Shared inboxes provided by another connected vendor remain available.`
              : ''
          }
          confirmLabel="Disconnect"
          variant="destructive"
          isPending={disconnectMutation.isPending}
          onConfirm={() => {
            if (!disconnectTarget) return;
            disconnectMutation.mutate(disconnectTarget.id, {
              onSuccess: () => setDisconnectTarget(null),
            });
          }}
        />

        <ConfirmDialog
          open={removeVendorTarget !== null}
          onOpenChange={(open) => !open && setRemoveVendorTarget(null)}
          title="Remove disconnected vendor account?"
          description={
            removeVendorTarget
              ? `${removeVendorTarget.emailAddress} will be removed from this organization in Elli. This does not delete the Microsoft account.`
              : ''
          }
          confirmLabel="Remove account"
          variant="destructive"
          isPending={removeVendorMutation.isPending}
          onConfirm={() => {
            if (!removeVendorTarget) return;
            removeVendorMutation.mutate(removeVendorTarget.id, {
              onSuccess: () => setRemoveVendorTarget(null),
            });
          }}
        />

        <ConfirmDialog
          open={removeMailboxTarget !== null}
          onOpenChange={(open) => !open && setRemoveMailboxTarget(null)}
          title="Remove common mailbox?"
          description={
            removeMailboxTarget
              ? `${removeMailboxTarget.displayName} (${removeMailboxTarget.emailAddress}) will be removed from Elli. The actual Microsoft shared mailbox and its messages will not be deleted.`
              : ''
          }
          confirmLabel="Remove mailbox"
          variant="destructive"
          isPending={removeMailboxMutation.isPending}
          onConfirm={() => {
            if (!removeMailboxTarget) return;
            removeMailboxMutation.mutate(removeMailboxTarget.id, {
              onSuccess: () => setRemoveMailboxTarget(null),
            });
          }}
        />

        <ConfirmDialog
          open={bulkRemoveOpen}
          onOpenChange={(open) => {
            if (!isBulkRemoving) setBulkRemoveOpen(open);
          }}
          title={
            validSelectedIds.length === 1
              ? 'Remove 1 common mailbox?'
              : `Remove ${validSelectedIds.length} common mailboxes?`
          }
          description={
            validSelectedIds.length === 1
              ? 'The selected mailbox will be removed from Elli. The actual Microsoft shared mailbox and its messages will not be deleted.'
              : `The selected mailboxes will be removed from Elli. The actual Microsoft shared mailboxes and their messages will not be deleted.`
          }
          confirmLabel={
            isBulkRemoving
              ? 'Removing...'
              : validSelectedIds.length === 1
                ? 'Remove mailbox'
                : `Remove ${validSelectedIds.length} mailboxes`
          }
          variant="destructive"
          isPending={isBulkRemoving}
          keepOpenOnConfirm
          onConfirm={async () => {
            if (validSelectedIds.length === 0) return;
            setIsBulkRemoving(true);
            const ids = [...validSelectedIds];
            // Call the API directly so the per-item hook toast doesn't fire N
            // times. We surface one summary toast at the end.
            const results = await Promise.allSettled(
              ids.map((id) => sharedMailboxesApi.removeSharedMailbox(id))
            );
            const removed = results.filter((result) => result.status === 'fulfilled').length;
            const failed = results.length - removed;
            setIsBulkRemoving(false);
            setBulkRemoveOpen(false);
            setSelectedMailboxIds((current) => {
              if (removed === 0) return current;
              const next = new Set(current);
              results.forEach((result, index) => {
                if (result.status === 'fulfilled') next.delete(ids[index]);
              });
              return next;
            });
            if (removed > 0) {
              void queryClient.invalidateQueries({
                queryKey: ['settings', 'shared-mailboxes'],
              });
              void queryClient.invalidateQueries({ queryKey: ['connected-email', 'accounts'] });
            }
            if (failed === 0) {
              toast.success(
                removed === 1 ? 'Removed 1 common mailbox.' : `Removed ${removed} common mailboxes.`
              );
            } else if (removed === 0) {
              toast.error('Could not remove the selected mailboxes. Try again.');
            } else {
              toast.warning(
                `Removed ${removed} of ${results.length}. ${failed} could not be removed.`
              );
            }
          }}
        />
      </main>
    </>
  );
}
