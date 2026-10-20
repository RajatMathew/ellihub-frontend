import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import type { SocialAuthenticationProviderDefinition } from '@/core/auth/config/social-auth-providers';
import { LoaderCircleIcon } from 'lucide-react';

interface SocialProviderAccountRowProps {
  provider: SocialAuthenticationProviderDefinition;
  connected: boolean;
  connecting: boolean;
  connectionDisabled: boolean;
  onConnect: (provider: SocialAuthenticationProviderDefinition) => Promise<void>;
}

export function SocialProviderAccountRow({
  provider,
  connected,
  connecting,
  connectionDisabled,
  onConnect,
}: SocialProviderAccountRowProps) {
  const Icon = provider.Icon;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{provider.displayName}</p>
            <Badge variant={connected ? 'success' : 'secondary'} appearance="light" size="sm">
              {connected ? 'Connected' : 'Not connected'}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {connected
              ? `You can sign in with ${provider.displayName}.`
              : `${provider.displayName} connects automatically when its email matches your verified Elli email.`}
          </p>
        </div>
      </div>

      {!connected ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={connectionDisabled}
          onClick={() => void onConnect(provider)}
        >
          {connecting ? <LoaderCircleIcon className="animate-spin" /> : <Icon />}
          {connecting ? 'Connecting...' : `Connect ${provider.displayName}`}
        </Button>
      ) : null}
    </div>
  );
}
