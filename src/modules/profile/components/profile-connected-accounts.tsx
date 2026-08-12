import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { linkSocialAccount } from '@/core/auth/api/auth-methods.api';
import {
  getSocialAuthenticationProvider,
  SOCIAL_AUTHENTICATION_PROVIDERS,
  type SocialAuthenticationProviderDefinition,
} from '@/core/auth/config/social-auth-providers';
import { getAuthCallbackErrorMessage } from '@/core/auth/lib/auth-redirect';
import { SocialProviderAccountRow } from '@/modules/profile/components/social-provider-account-row';
import { useAuthenticationMethodsQuery } from '@/modules/profile/hooks/profile.hooks';
import { RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export function ProfileConnectedAccounts() {
  const [connectingProviderId, setConnectingProviderId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const methodsQuery = useAuthenticationMethodsQuery();

  useEffect(() => {
    const action = searchParams.get('auth_action');
    if (action !== 'link_social') return;

    const provider = getSocialAuthenticationProvider(
      searchParams.get('linked') ?? searchParams.get('provider')
    );

    const errorMessage = getAuthCallbackErrorMessage(searchParams.get('error'));
    if (errorMessage) {
      toast.error(errorMessage);
    } else if (provider && searchParams.get('linked') === provider.id) {
      toast.success(`${provider.displayName} account connected.`);
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('auth_action');
    nextSearchParams.delete('linked');
    nextSearchParams.delete('provider');
    nextSearchParams.delete('error');
    nextSearchParams.delete('error_description');
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  if (methodsQuery.isLoading) {
    return (
      <SignInMethodsSection>
        <Skeleton className="h-20 w-full" role="status" aria-label="Loading connected accounts" />
      </SignInMethodsSection>
    );
  }

  if (methodsQuery.isError || !methodsQuery.data) {
    return (
      <SignInMethodsSection>
        <div className="flex flex-col gap-3 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Unable to load sign-in methods</p>
            <p className="text-xs text-muted-foreground">
              Your password sign-in is still available.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void methodsQuery.refetch()}
          >
            <RotateCcw />
            Retry
          </Button>
        </div>
      </SignInMethodsSection>
    );
  }

  const capabilities = methodsQuery.data.capabilities.providers;
  const enabledProviders = SOCIAL_AUTHENTICATION_PROVIDERS.filter(
    (provider) => capabilities[provider.id]
  );
  if (enabledProviders.length === 0) return null;
  const accounts = methodsQuery.data.accounts;

  async function connectProvider(provider: SocialAuthenticationProviderDefinition) {
    setConnectingProviderId(provider.id);

    try {
      await linkSocialAccount(
        provider.id,
        `/app/profile?auth_action=link_social&linked=${provider.id}`,
        `/app/profile?auth_action=link_social&provider=${provider.id}`
      );
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, `${provider.displayName} account could not be connected.`)
      );
      setConnectingProviderId(null);
    }
  }

  return (
    <SignInMethodsSection>
      <div className="space-y-3">
        {enabledProviders.map((provider) => (
          <SocialProviderAccountRow
            key={provider.id}
            provider={provider}
            connected={accounts.some((account) => account.providerId === provider.id)}
            connecting={connectingProviderId === provider.id}
            connectionDisabled={connectingProviderId !== null}
            onConnect={connectProvider}
          />
        ))}
      </div>
    </SignInMethodsSection>
  );
}

function SignInMethodsSection({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sign-in methods</h3>
          <p className="text-xs text-muted-foreground">
            Enabled providers link automatically when your verified Elli email matches.
          </p>
        </div>
        {children}
      </div>
      <Separator />
    </>
  );
}
