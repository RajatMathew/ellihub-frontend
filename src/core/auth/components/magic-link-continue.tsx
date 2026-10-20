import { useState } from 'react';

import { LoaderCircleIcon } from 'lucide-react';

import { getAuthEndpointUrl } from '@app/api';
import { Button } from '@app/components/ui/button';
import { buildMagicLinkVerifyUrl } from '@core/auth/lib/magic-link';

interface MagicLinkContinueProps {
  token: string;
  /** Where to land once signed in. */
  next: string;
  /** False once the API reports sign-in links switched off: the link can no longer work. */
  available: boolean;
  onCancel: () => void;
}

/**
 * The page a sign-in link opens. It waits for a click on purpose: a mail
 * scanner that opens the link, or even runs this page, never presses Continue,
 * so it cannot spend the single-use token before the person does.
 */
export function MagicLinkContinue({ token, next, available, onCancel }: MagicLinkContinueProps) {
  const [redirecting, setRedirecting] = useState(false);

  if (!available) {
    return (
      <div className="block w-full space-y-5">
        <div className="text-center space-y-1 pb-3">
          <h1 className="text-2xl font-medium tracking-tight">This link can&apos;t be used</h1>
          <p className="text-sm text-muted-foreground">
            Email sign-in links are turned off for ElliHub. Sign in another way instead.
          </p>
        </div>

        <Button type="button" size="lg" className="w-full h-10 text-sm" onClick={onCancel}>
          See ways to sign in
        </Button>
      </div>
    );
  }

  function continueSignIn() {
    setRedirecting(true);
    // A navigation, not a fetch or a router push: the API sets the session
    // cookie and redirects back here, the same round trip social sign-in makes.
    window.location.assign(
      buildMagicLinkVerifyUrl({
        verifyEndpoint: getAuthEndpointUrl('/magic-link/verify'),
        appOrigin: window.location.origin,
        token,
        next,
      })
    );
  }

  return (
    <div className="block w-full space-y-5">
      <div className="text-center space-y-1 pb-3">
        <h1 className="text-2xl font-medium tracking-tight">Sign in to ElliHub</h1>
        <p className="text-sm text-muted-foreground">
          Continue to finish signing in with the link from your email.
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full h-10 text-sm"
        disabled={redirecting}
        onClick={continueSignIn}
      >
        {redirecting ? (
          <span className="flex items-center gap-2">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          'Continue to ElliHub'
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={redirecting}
        onClick={onCancel}
      >
        Use another way to sign in
      </Button>
    </div>
  );
}
