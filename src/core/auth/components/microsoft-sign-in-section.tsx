import { useCallback, useEffect, useState } from 'react';

import { signIn } from '@/app/api';
import { Button } from '@/app/components/ui/button';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { getAuthCapabilities } from '@/core/auth/api/auth-methods.api';
import { MicrosoftIcon } from '@/core/auth/components/microsoft-icon';
import { LoaderCircleIcon, RotateCcw } from 'lucide-react';

type Availability = 'loading' | 'enabled' | 'disabled' | 'error';

interface MicrosoftSignInSectionProps {
  callbackURL: string;
  disabled?: boolean;
  onError: (message: string | null) => void;
}

export function MicrosoftSignInSection({
  callbackURL,
  disabled = false,
  onError,
}: MicrosoftSignInSectionProps) {
  const [availability, setAvailability] = useState<Availability>('loading');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadRequest, setLoadRequest] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void getAuthCapabilities()
      .then((capabilities) => {
        if (!cancelled) {
          setAvailability(capabilities.providers.microsoft ? 'enabled' : 'disabled');
        }
      })
      .catch(() => {
        if (!cancelled) setAvailability('error');
      });

    return () => {
      cancelled = true;
    };
  }, [loadRequest]);

  const startMicrosoftSignIn = useCallback(async () => {
    setIsRedirecting(true);
    onError(null);

    try {
      await signIn.social(
        {
          provider: 'microsoft',
          callbackURL,
          errorCallbackURL: `/sign-in?next=${encodeURIComponent(callbackURL)}`,
        },
        {
          onError: (context) => {
            onError(getApiErrorMessage(context, 'Microsoft sign-in could not be started.'));
          },
        }
      );
    } catch (error: unknown) {
      onError(getApiErrorMessage(error, 'Microsoft sign-in could not be started.'));
    } finally {
      setIsRedirecting(false);
    }
  }, [callbackURL, onError]);

  if (availability === 'disabled') return null;

  return (
    <div className="space-y-4">
      {availability === 'loading' ? (
        <Skeleton
          className="h-10 w-full"
          role="status"
          aria-label="Checking Microsoft sign-in availability"
        />
      ) : availability === 'error' ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Microsoft sign-in is unavailable.</span>
          <Button
            type="button"
            variant="dim"
            size="sm"
            onClick={() => {
              setAvailability('loading');
              setLoadRequest((request) => request + 1);
            }}
          >
            <RotateCcw />
            Retry
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={disabled || isRedirecting}
          onClick={() => void startMicrosoftSignIn()}
        >
          {isRedirecting ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <MicrosoftIcon className="size-4" />
          )}
          {isRedirecting ? 'Opening Microsoft...' : 'Continue with Microsoft'}
        </Button>
      )}

      <div className="flex items-center gap-3" aria-hidden="true">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or continue with email</span>
        <Separator className="flex-1" />
      </div>
    </div>
  );
}
