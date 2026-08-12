import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import {
  useDiscoverSharedMailboxesMutation,
  useSharedMailboxesQuery,
  useVendorConnectionsQuery,
} from '@/modules/settings/hooks/shared-mailboxes.hooks';
import { AlertCircle, CheckCircle2, Mail, Plus, RefreshCw, Users } from 'lucide-react';

export function SharedMailboxesPage() {
  const { isAdmin, isLoading: isAccessLoading } = useAccess();
  const mailboxesQuery = useSharedMailboxesQuery(isAdmin);
  const vendorConnectionsQuery = useVendorConnectionsQuery(isAdmin);
  const discoverMutation = useDiscoverSharedMailboxesMutation();

  if (isAccessLoading || mailboxesQuery.isLoading || vendorConnectionsQuery.isLoading) {
    return (
      <div className="container-fluid space-y-5 py-7.5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="container-fluid py-7.5">You do not have access to this page.</div>;
  }

  const hasError = mailboxesQuery.isError || vendorConnectionsQuery.isError;
  if (hasError) {
    return (
      <main className="container-fluid py-7.5">
        <section className="flex max-w-xl flex-col items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle aria-hidden="true" className="size-4" />
            <h1 className="text-sm font-semibold">Couldn&apos;t load common inboxes</h1>
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
    );
  }

  const mailboxes = mailboxesQuery.data ?? [];
  const vendorConnections = vendorConnectionsQuery.data ?? [];

  return (
    <main className="container-fluid space-y-7 py-7.5">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Organization email
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Common inboxes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Connect Microsoft vendor accounts to discover the shared mailboxes they can access. Elli
            merges the same mailbox automatically, so everyone sees one inbox.
          </p>
        </div>
        <Button
          type="button"
          disabled={discoverMutation.isPending}
          aria-busy={discoverMutation.isPending}
          onClick={() => discoverMutation.mutate()}
        >
          {discoverMutation.isPending ? (
            <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Plus aria-hidden="true" className="size-4" />
          )}
          {discoverMutation.isPending ? 'Connecting...' : 'Connect vendor account'}
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users aria-hidden="true" className="size-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Vendor accounts</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{vendorConnections.length}</p>
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
          <p className="mt-1 text-xs text-muted-foreground">Duplicates merged by mailbox address</p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Connected vendor accounts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add another account whenever a team needs coverage from a different Microsoft tenant or
            user.
          </p>
        </div>
        {vendorConnections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
            <Users aria-hidden="true" className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No vendor accounts connected</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Connect the first Microsoft account to discover the shared mailboxes available to your
              organization.
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Shared mailboxes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Each address appears once, even when multiple vendor accounts provide access.
          </p>
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
              const isConnected = mailbox.account?.status === 'CONNECTED';
              return (
                <article
                  key={mailbox.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                      <Mail aria-hidden="true" className="size-5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0">
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={isConnected ? 'success' : 'warning'} appearance="light">
                      {isConnected ? 'Ready for everyone' : 'Needs attention'}
                    </Badge>
                    {isConnected && (
                      <CheckCircle2 aria-hidden="true" className="size-4 text-success-accent" />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
