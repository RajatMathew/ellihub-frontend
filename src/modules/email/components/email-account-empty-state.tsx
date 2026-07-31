import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useStartEmailAuthMutation } from '@/modules/email/hooks';
import { LockKeyhole, MailPlus } from 'lucide-react';

const GOOGLE_ICON_URL = 'https://developers.google.com/static/identity/images/g-logo.png';
const MICROSOFT_ICON_URL =
  'https://learn.microsoft.com/en-us/entra/identity-platform/media/howto-add-branding-in-apps/ms-symbollockup_mssymbol_19.svg';

export function EmailAccountEmptyState() {
  const startAuthMutation = useStartEmailAuthMutation();
  const connectingProvider = startAuthMutation.variables?.provider;

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
          Add an email account
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Connect Gmail or Outlook to read, reply, and manage your email from Elli.
        </p>

        <div className="mt-7 w-full max-w-sm space-y-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full justify-start gap-3 bg-background px-4"
            disabled={startAuthMutation.isPending}
            aria-busy={connectingProvider === 'gmail'}
            onClick={() => startAuthMutation.mutate({ provider: 'gmail' })}
          >
            <img src={GOOGLE_ICON_URL} alt="" className="size-5 object-contain" />
            <span>{connectingProvider === 'gmail' ? 'Connecting...' : 'Continue with Google'}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full justify-start gap-3 bg-background px-4"
            disabled={startAuthMutation.isPending}
            aria-busy={connectingProvider === 'outlook'}
            onClick={() => startAuthMutation.mutate({ provider: 'outlook' })}
          >
            <img src={MICROSOFT_ICON_URL} alt="" className="size-5 object-contain" />
            <span>
              {connectingProvider === 'outlook'
                ? 'Connecting...'
                : 'Continue with Microsoft'}
            </span>
          </Button>
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          You will continue securely with your email provider.
        </p>
      </section>
    </main>
  );
}

export function EmailAccountsLoadingState() {
  return (
    <main
      className="flex h-[calc(100dvh-var(--header-height-mobile))] items-center justify-center bg-background p-6 lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]"
      aria-label="Loading connected email accounts"
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
