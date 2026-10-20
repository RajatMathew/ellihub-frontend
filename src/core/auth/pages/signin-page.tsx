import { useState, useSyncExternalStore } from 'react';

import { AlertCircle, Check, LoaderCircleIcon } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router-dom';

import { useSession } from '@app/api';
import { Alert, AlertIcon, AlertTitle } from '@app/components/ui/alert';
import { Button } from '@app/components/ui/button';
import { Skeleton } from '@app/components/ui/skeleton';
import { useResetOnChange } from '@app/hooks/use-reset-on-change';
import { MagicLinkContinue } from '@core/auth/components/magic-link-continue';
import { MagicLinkRequest } from '@core/auth/components/magic-link-request';
import { PasswordSignInForm } from '@core/auth/components/password-sign-in-form';
import { SocialSignInSection } from '@core/auth/components/social-sign-in-section';
import { useAuthCapabilities } from '@core/auth/hooks/use-auth-capabilities';
import { getAuthCallbackErrorMessage, getSafeAuthRedirect } from '@core/auth/lib/auth-redirect';
import {
  clearCapturedMagicLinkToken,
  getCapturedMagicLinkToken,
  isMagicLinkEnabled,
  subscribeToCapturedMagicLinkToken,
} from '@core/auth/lib/magic-link';
import { isPasswordSignInEnabled } from '@core/auth/lib/password-sign-in';
import {
  canContinueWithSignInLink,
  getInitialSignInMethod,
  resolveSignInView,
  type SignInMethod,
} from '@core/auth/lib/sign-in-view';

export function SignInPageComponent() {
  const [searchParams] = useSearchParams();
  const { state: capabilities, retry: retryCapabilities } = useAuthCapabilities();

  const [chosenMethod, setChosenMethod] = useState<SignInMethod | null>(() =>
    getInitialSignInMethod(searchParams)
  );
  const magicLinkToken = useSyncExternalStore(
    subscribeToCapturedMagicLinkToken,
    getCapturedMagicLinkToken
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle URL params. Read during render when the query changes, so the page
  // never paints without the message the link it was opened from carries.
  useResetOnChange(searchParams.toString(), () => {
    const pwdReset = searchParams.get('pwd_reset');
    const errorParam = searchParams.get('error');

    if (pwdReset === 'success') {
      setSuccessMessage(
        'Your password has been successfully reset. You can now sign in with your new password.'
      );
    }

    setError(getAuthCallbackErrorMessage(errorParam));
  });

  const callbackURL = getSafeAuthRedirect(searchParams.get('next'));
  const magicLinkEnabled =
    capabilities.status === 'loaded' && isMagicLinkEnabled(capabilities.capabilities);
  const passwordEnabled =
    capabilities.status !== 'loaded' || isPasswordSignInEnabled(capabilities.capabilities);
  const view = resolveSignInView({
    chosen: chosenMethod,
    capabilities: capabilities.status,
    magicLinkEnabled,
    passwordEnabled,
  });

  if (magicLinkToken) {
    return (
      <MagicLinkContinue
        token={magicLinkToken}
        next={callbackURL}
        available={canContinueWithSignInLink(capabilities.status, magicLinkEnabled)}
        onCancel={clearCapturedMagicLinkToken}
      />
    );
  }

  function switchMethod(next: SignInMethod) {
    setChosenMethod(next);
    setError(null);
    setSuccessMessage(null);
  }

  return (
    <div className="block w-full space-y-5">
      <div className="text-center space-y-1 pb-3">
        <h1 className="text-2xl font-medium tracking-tight">Welcome back!</h1>
        <p className="text-sm text-muted-foreground">
          {view === 'magic-link'
            ? 'We will email you a link that signs you in.'
            : view === 'social-only'
              ? 'Sign in with your organization account to continue.'
              : 'Sign in with your ElliHub account to continue.'}
        </p>
      </div>

      {error && (
        <Alert variant="destructive" appearance="light" onClose={() => setError(null)}>
          <AlertIcon>
            <AlertCircle />
          </AlertIcon>
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {successMessage && (
        <Alert appearance="light" onClose={() => setSuccessMessage(null)}>
          <AlertIcon>
            <Check />
          </AlertIcon>
          <AlertTitle>{successMessage}</AlertTitle>
        </Alert>
      )}

      {view === 'loading' ? (
        <Skeleton className="h-40 w-full" role="status" aria-label="Loading sign-in options" />
      ) : view === 'magic-link' ? (
        <>
          <MagicLinkRequest next={callbackURL} onError={setError} />
          {passwordEnabled && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => switchMethod('password')}
            >
              Sign in with your password instead
            </Button>
          )}
        </>
      ) : view === 'social-only' ? null : (
        <>
          <PasswordSignInForm
            processing={isProcessing}
            onProcessingChange={setIsProcessing}
            onError={setError}
            onSuccess={setSuccessMessage}
          />
          {magicLinkEnabled && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={isProcessing}
              onClick={() => switchMethod('magic-link')}
            >
              Email me a sign-in link
            </Button>
          )}
        </>
      )}

      <SocialSignInSection
        callbackURL={callbackURL}
        capabilities={capabilities}
        onRetry={retryCapabilities}
        disabled={isProcessing}
        onError={setError}
        standalone={view === 'social-only'}
      />

      {view === 'social-only' && (
        <p className="text-center text-xs text-muted-foreground">
          Can&apos;t sign in? Ask your ElliHub administrator for access.
        </p>
      )}
    </div>
  );
}

export const SignInPage = () => {
  const { isPending, data } = useSession();
  const [searchParams] = useSearchParams();
  const next = getSafeAuthRedirect(searchParams.get('next'));

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoaderCircleIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (data && data.session) return <Navigate to={next} replace />;

  return <SignInPageComponent />;
};
