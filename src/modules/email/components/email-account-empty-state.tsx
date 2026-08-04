import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { SharedMailboxKey } from '@/modules/email/api';
import {
  EMAIL_PROVIDER_DETAILS,
  type EmailProvider,
} from '@/modules/email/constants/email-providers';
import { useEmailConfigQuery, useStartEmailAuthMutation } from '@/modules/email/hooks';
import { LockKeyhole, MailPlus } from 'lucide-react';

const EMAIL_PROVIDERS: EmailProvider[] = ['gmail', 'outlook', 'zoho'];

type EmailAccountEmptyStateProps = {
  sharedMailboxKey?: SharedMailboxKey;
  title?: string;
  description?: string;
  connectionsDisabled?: boolean;
};

export function EmailAccountEmptyState({
  sharedMailboxKey,
  title = 'Add a personal email account',
  description = 'Connect Gmail, Outlook, or Zoho Mail to read, reply, and manage your email from Elli. Only you can see and use accounts you connect.',
  connectionsDisabled = false,
}: EmailAccountEmptyStateProps) {
  const configQuery = useEmailConfigQuery();
  const startAuthMutation = useStartEmailAuthMutation();
  const connectingProvider = startAuthMutation.variables?.provider;
  const enabledProviders = configQuery.data?.enabledProviders ?? [];

  return (
    <main className="flex h-[calc(100dvh-var(--header-height-mobile))] items-center justify-center overflow-auto bg-background px-4 py-10 lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)] lg:px-8">
      <section
        className="flex w-full max-w-lg flex-col items-center text-center"
        aria-labelledby="connect-email-heading"
      >
        <div className="mb-5 flex size-12 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
          <MailPlus className="size-5" aria-hidden="true" />
        </div>

        <h1
          id="connect-email-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>

        {connectionsDisabled ? (
          <p className="mt-7 max-w-sm rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Personal email account connections are currently disabled.
          </p>
        ) : configQuery.isLoading ? (
          <div className="mt-7 w-full max-w-sm space-y-3">
            {EMAIL_PROVIDERS.map((provider) => (
              <Skeleton key={provider} className="h-12 w-full" />
            ))}
          </div>
        ) : configQuery.isError ? (
          <QueryErrorState
            className="mt-7 w-full max-w-sm"
            title="Could not load email providers"
            description="Check your connection and try again."
            onRetry={() => void configQuery.refetch()}
          />
        ) : enabledProviders.length === 0 ? (
          <p className="mt-7 max-w-sm rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Email account connections are currently disabled.
          </p>
        ) : (
          <div className="mt-7 w-full max-w-sm space-y-3">
            {enabledProviders.map((provider) => {
              const details = EMAIL_PROVIDER_DETAILS[provider];
              const isConnecting = connectingProvider === provider;
              return (
                <Button
                  key={provider}
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full justify-start gap-3 bg-background px-4"
                  disabled={startAuthMutation.isPending}
                  aria-busy={isConnecting}
                  onClick={() => startAuthMutation.mutate({ provider, sharedMailboxKey })}
                >
                  <img src={details.iconUrl} alt="" className="size-5 object-contain" />
                  <span>{isConnecting ? 'Connecting...' : details.connectLabel}</span>
                </Button>
              );
            })}
          </div>
        )}

        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          {sharedMailboxKey
            ? 'Accessible to everyone in Elli after connection. You will continue securely with your email provider.'
            : 'Private to your Elli account. You will continue securely with your email provider.'}
        </p>
      </section>
    </main>
  );
}

export function EmailAccountsLoadingState() {
  return (
    <main
      className="flex h-[calc(100dvh-var(--header-height-mobile))] items-center justify-center bg-background p-6 lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]"
      aria-label="Loading personal email accounts"
    >
      <div className="flex w-full max-w-md flex-col items-center">
        <Skeleton className="size-14" />
        <Skeleton className="mt-6 h-7 w-56" />
        <Skeleton className="mt-3 h-4 w-full max-w-sm" />
        <div className="mt-8 grid w-full grid-cols-2 gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>
    </main>
  );
}

export function EmailAccountsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="flex h-[calc(100dvh-var(--header-height-mobile))] items-center justify-center bg-background p-6 lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <QueryErrorState
        className="w-full max-w-lg"
        title="Could not load your email accounts"
        description="Check your connection and try again."
        onRetry={onRetry}
      />
    </main>
  );
}
