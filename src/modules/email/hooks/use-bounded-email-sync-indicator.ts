import { useEffect, useState } from 'react';

export const EMAIL_SYNC_INDICATOR_MAX_DURATION_MS = 5_000;

export function useBoundedEmailSyncIndicator(
  isPending: boolean,
  operationKey: string,
  maxDurationMs = EMAIL_SYNC_INDICATOR_MAX_DURATION_MS
) {
  const [timedOutOperationKey, setTimedOutOperationKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending) return;

    const timeout = window.setTimeout(() => {
      setTimedOutOperationKey(operationKey);
    }, maxDurationMs);

    return () => window.clearTimeout(timeout);
  }, [isPending, maxDurationMs, operationKey]);

  return isPending && timedOutOperationKey !== operationKey;
}
