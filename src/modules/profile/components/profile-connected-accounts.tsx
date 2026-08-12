import { useEffect, useState, type ReactNode } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { linkMicrosoftAccount } from '@/core/auth/api/auth-methods.api';
import { MicrosoftIcon } from '@/core/auth/components/microsoft-icon';
import { getAuthCallbackErrorMessage } from '@/core/auth/lib/auth-redirect';
import { useAuthenticationMethodsQuery } from '@/modules/profile/hooks/profile.hooks';
import { LoaderCircleIcon, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export function ProfileConnectedAccounts() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const methodsQuery = useAuthenticationMethodsQuery();

  useEffect(() => {
    const action = searchParams.get('auth_action');
    if (action !== 'link_microsoft') return;

    const errorMessage = getAuthCallbackErrorMessage(searchParams.get('error'));
    if (errorMessage) {
      toast.error(errorMessage);
    } else if (searchParams.get('linked') === 'microsoft') {
      toast.success('Microsoft account connected.');
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('auth_action');
    nextSearchParams.delete('linked');
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

  if (!methodsQuery.data.capabilities.providers.microsoft) return null;

  const accounts = methodsQuery.data.accounts;
  const microsoftConnected = accounts.some((account) => account.providerId === 'microsoft');

  async function connectMicrosoft() {
    setIsConnecting(true);

    try {
      await linkMicrosoftAccount(
        '/app/profile?auth_action=link_microsoft&linked=microsoft',
        '/app/profile?auth_action=link_microsoft'
      );
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Microsoft account could not be connected.'));
      setIsConnecting(false);
    }
  }

  return (
    <SignInMethodsSection>
      <div className="flex flex-col gap-4 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
            <MicrosoftIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">Microsoft</p>
              <Badge
                variant={microsoftConnected ? 'success' : 'secondary'}
                appearance="light"
                size="sm"
              >
                {microsoftConnected ? 'Connected' : 'Not connected'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {microsoftConnected
                ? 'You can use Microsoft or your Elli password to sign in.'
                : 'Microsoft connects automatically when its email matches your verified Elli email.'}
            </p>
          </div>
        </div>

        {!microsoftConnected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isConnecting}
            onClick={() => void connectMicrosoft()}
          >
            {isConnecting ? <LoaderCircleIcon className="animate-spin" /> : <MicrosoftIcon />}
            {isConnecting ? 'Connecting...' : 'Connect Microsoft'}
          </Button>
        ) : null}
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
            Microsoft links automatically when your verified Elli email matches.
          </p>
        </div>
        {children}
      </div>
      <Separator />
    </>
  );
}
