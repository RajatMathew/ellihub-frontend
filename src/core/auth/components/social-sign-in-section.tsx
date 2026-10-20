import { useState } from 'react';

import { signIn } from '@/app/api';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import {
  SOCIAL_AUTHENTICATION_PROVIDERS,
  type SocialAuthenticationProviderDefinition,
} from '@/core/auth/config/social-auth-providers';
import { type AuthCapabilitiesState } from '@/core/auth/hooks/use-auth-capabilities';
import { LoaderCircleIcon, RotateCcw } from 'lucide-react';

interface SocialSignInSectionProps {
  callbackURL: string;
  capabilities: AuthCapabilitiesState;
  onRetry: () => void;
  disabled?: boolean;
  /** The only way to sign in left on the page: no "or continue with" divider. */
  standalone?: boolean;
  onError: (message: string | null) => void;
}

export function SocialSignInSection({
  callbackURL,
  capabilities,
  onRetry,
  disabled = false,
  standalone = false,
  onError,
}: SocialSignInSectionProps) {
  const [redirectingProviderId, setRedirectingProviderId] = useState<string | null>(null);
  const availability = capabilities.status;

  const enabledProviders =
    capabilities.status === 'loaded'
      ? SOCIAL_AUTHENTICATION_PROVIDERS.filter(
          (provider) => capabilities.capabilities.providers[provider.id] === true
        )
      : [];

  async function startSocialSignIn(provider: SocialAuthenticationProviderDefinition) {
    setRedirectingProviderId(provider.id);
    onError(null);

    try {
      await signIn.social(
        {
          provider: provider.id,
          callbackURL,
          errorCallbackURL: `/sign-in?next=${encodeURIComponent(callbackURL)}`,
        },
        {
          onError: (context) => {
            onError(
              getApiErrorMessage(context, `${provider.displayName} sign-in could not be started.`)
            );
          },
        }
      );
    } catch (error: unknown) {
      onError(getApiErrorMessage(error, `${provider.displayName} sign-in could not be started.`));
    } finally {
      setRedirectingProviderId(null);
    }
  }

  if (availability === 'loaded' && enabledProviders.length === 0) return null;

  return (
    <div className="space-y-4">
      {!standalone && (
        <div className="flex items-center gap-3" aria-hidden="true">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or continue with</span>
          <Separator className="flex-1" />
        </div>
      )}

      {availability === 'loading' ? (
        <Skeleton
          className="h-10 w-full"
          role="status"
          aria-label="Checking social sign-in availability"
        />
      ) : availability === 'error' ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Social sign-in is unavailable.</span>
          <Button type="button" variant="dim" size="sm" onClick={onRetry}>
            <RotateCcw />
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {enabledProviders.map((provider) => {
            const isRedirecting = redirectingProviderId === provider.id;
            const Icon = provider.Icon;

            return (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={disabled || redirectingProviderId !== null}
                onClick={() => void startSocialSignIn(provider)}
              >
                {isRedirecting ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <Icon className="size-4" />
                )}
                {isRedirecting
                  ? `Opening ${provider.displayName}...`
                  : `Continue with ${provider.displayName}`}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
