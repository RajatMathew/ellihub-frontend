import { useEffect, useMemo, useState } from 'react';

import { emailApi, type EmailContactSuggestion } from '@/modules/email/api/email.api';
import { emailKeys } from '@/modules/email/hooks/email.hooks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

/**
 * Debounced recipient suggestions for an address field: addresses the mailbox
 * has corresponded with, minus the ones already picked.
 */
export function useEmailAddressSuggestions(
  accountId: string | undefined,
  rawQuery: string,
  excludedAddresses: string[],
  enabled: boolean
): EmailContactSuggestion[] {
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(rawQuery.trim()), 200);
    return () => window.clearTimeout(timeout);
  }, [rawQuery]);

  const suggestionsQuery = useQuery({
    queryKey: emailKeys.contactSuggestions(accountId, debouncedQuery),
    queryFn: () => emailApi.listContactSuggestions(accountId!, debouncedQuery),
    enabled: enabled && Boolean(accountId),
    staleTime: 60 * 1000,
    // Keep the previous list on screen between keystrokes — no flashing while
    // the narrower result set loads.
    placeholderData: keepPreviousData,
  });

  return useMemo(() => {
    const excluded = new Set(excludedAddresses.map((address) => address.toLowerCase()));
    return (suggestionsQuery.data ?? []).filter(
      (suggestion) => !excluded.has(suggestion.address.toLowerCase())
    );
  }, [excludedAddresses, suggestionsQuery.data]);
}
