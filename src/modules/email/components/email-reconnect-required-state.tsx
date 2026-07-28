import { Button } from '@/app/components/ui/button';
import type { EmailProvider } from '@/modules/email/api';
import { Link2Off } from 'lucide-react';

interface EmailReconnectRequiredStateProps {
  provider: EmailProvider;
  email: string;
  isReconnecting: boolean;
  onReconnect: () => void;
}

export function EmailReconnectRequiredState({
  provider,
  email,
  isReconnecting,
  onReconnect,
}: EmailReconnectRequiredStateProps) {
  const providerLabel = provider === 'outlook' ? 'Outlook' : 'Gmail';

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-muted/20 px-6 py-10"
      aria-label="Email account reconnect required"
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-border bg-background">
          <Link2Off aria-hidden="true" className="size-5 text-muted-foreground" strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-foreground">
          Reconnect your {providerLabel} account
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The authorization for {email} is no longer valid. Sign in to {providerLabel} again to
          continue viewing and sending email. Your Elli session is still active.
        </p>
        <Button
          type="button"
          className="mt-5"
          disabled={isReconnecting}
          aria-busy={isReconnecting}
          onClick={onReconnect}
        >
          {isReconnecting ? 'Opening sign-in…' : `Reconnect ${providerLabel}`}
        </Button>
      </div>
    </section>
  );
}
