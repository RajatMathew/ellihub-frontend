import { useCallback, useMemo } from 'react';

import { useEmailAccountsQuery } from '@/modules/email/hooks';
import { buildMailPath } from '@/modules/email/lib/email-paths';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';

/**
 * The mail deep link for an email a task was raised from, or null.
 *
 * A reference stores provider coordinates rather than a URL, deliberately — a
 * link would rot the moment the mail routes changed. So it is rebuilt here from
 * the same helpers the mailbox itself uses.
 *
 * Two things the reference does not carry have to be recovered:
 *
 * - the account *slug*, because a reference stores the account id. It comes
 *   from the accounts list, which the mail sidebar has already loaded and
 *   React Query hands over without a second request.
 * - the *folder*, which is not stored at all. It does not need to be: the id
 *   segment is a conversation id, and the API resolves a message by cache id,
 *   provider id or conversation id regardless of which folder it sits in. The
 *   folder only picks the list rendered behind the message, so the inbox is a
 *   reasonable backdrop for a message that could be anywhere.
 *
 * Returns null rather than a broken link while the accounts are still loading,
 * or when the account behind the reference is gone — a task outlives the
 * mailbox it was raised from.
 */
const FALLBACK_FOLDER = 'inbox';

export function useEmailReferenceLink() {
  const accountsQuery = useEmailAccountsQuery();

  const slugsById = useMemo(() => {
    const entries = new Map<string, string>();
    for (const account of accountsQuery.data ?? []) {
      entries.set(account.id, getEmailAccountSlug(account));
    }
    return entries;
  }, [accountsQuery.data]);

  return useCallback(
    (reference: TaskEmailReference): string | null => {
      const slug = slugsById.get(reference.accountId);
      if (!slug) return null;

      const conversationId =
        reference.conversationKey ?? reference.threadId ?? reference.providerId;
      if (!conversationId) return null;

      return buildMailPath(slug, FALLBACK_FOLDER, conversationId);
    },
    [slugsById]
  );
}
