import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useAccess } from '@/app/contexts/access-context';
import {
  useDiscoverSharedMailboxesMutation,
  useSharedMailboxesQuery,
} from '@/modules/settings/hooks/shared-mailboxes.hooks';
import { Mail, RefreshCw } from 'lucide-react';

export function SharedMailboxesPage() {
  const { isAdmin, isLoading: isAccessLoading } = useAccess();
  const mailboxesQuery = useSharedMailboxesQuery(isAdmin);
  const discoverMutation = useDiscoverSharedMailboxesMutation();

  if (isAccessLoading || mailboxesQuery.isLoading) {
    return (
      <div className="container-fluid space-y-5 py-7.5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <div className="container-fluid py-7.5">You do not have access to this page.</div>;
  }

  const mailboxes = mailboxesQuery.data ?? [];
  return (
    <main className="container-fluid space-y-7 py-7.5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Common inboxes</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Connect the vendor Microsoft account once. Elli will discover the shared mailboxes it
          can access and make them available to everyone in the organization.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-background p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Vendor account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reconnect to refresh the discovered shared mailbox list.
            </p>
          </div>
          <Button
            type="button"
            disabled={discoverMutation.isPending}
            onClick={() => discoverMutation.mutate()}
          >
            <RefreshCw
              aria-hidden="true"
              className={discoverMutation.isPending ? 'size-4 animate-spin' : 'size-4'}
            />
            {discoverMutation.isPending ? 'Connecting...' : 'Connect vendor account'}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-background shadow-xs">
        {mailboxes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <Mail aria-hidden="true" className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No common inboxes configured yet.</p>
          </div>
        ) : (
          mailboxes.map((mailbox) => {
            const isConnected = Boolean(mailbox.account);
            return (
              <article
                key={mailbox.id}
                className="flex flex-col gap-4 border-b border-border p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                    <Mail aria-hidden="true" className="size-5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {mailbox.displayName}
                    </h2>
                    <p className="truncate text-sm text-muted-foreground">
                      {mailbox.emailAddress}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {isConnected ? `Connection: ${mailbox.account?.status.toLowerCase()}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Connected automatically' : 'Not connected'}
                </span>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
