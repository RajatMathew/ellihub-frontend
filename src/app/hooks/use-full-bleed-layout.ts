import { useEffect } from 'react';

import { useLayout } from '@app/hooks/use-layout';

/**
 * Hands the whole viewport to the page that calls it: no app header, no nav
 * sidebar, no page margins, for as long as it stays mounted.
 *
 * Used by the mailbox (elli-ui#921), which is a full application of its own —
 * its own account bar, its own navigation, its own two-column body — and was
 * redrawn with no room for the shell around it. A page that takes the chrome
 * away owes the user a way back to the rest of the app; the mailbox puts that
 * in its account bar.
 *
 * `enabled` is a parameter rather than a call-site condition so the hook obeys
 * the rules of hooks in pages that only sometimes go full-bleed.
 */
export function useFullBleedLayout(enabled = true) {
  const { setChromeHidden } = useLayout();

  useEffect(() => {
    if (!enabled) return;
    setChromeHidden(true);
    return () => setChromeHidden(false);
  }, [enabled, setChromeHidden]);
}
