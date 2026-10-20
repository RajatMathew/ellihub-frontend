import { useMemo, useState } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { EmailActivity } from '@/modules/email/api';
import { useEmailAccountsQuery } from '@/modules/email/hooks';
import { useEmailActivityFeedQuery } from '@/modules/email/hooks/email-activity.hooks';
import { buildMailPath } from '@/modules/email/lib/email-paths';
import { clubTriageActivity, groupActivityByDay } from '@/modules/email/lib/thread-activity';
import { getEmailAccountSlug } from '@/modules/email/utils/email-account-slug';
import { LoaderCircle } from 'lucide-react';

import { EmailActivityFeedRow } from './email-activity-feed-row';

const ALL = 'all';

/**
 * Everything done from mail, in every mailbox the reader can open
 * (elli-ui#1309) — who did what, from which mailbox and thread, a person or
 * Elliot with whoever approved it. Newest first, a page at a time.
 */
export function EmailActivityFeed() {
  const [accountId, setAccountId] = useState(ALL);
  const [actorType, setActorType] = useState<'all' | 'human' | 'agent'>('all');
  const accountsQuery = useEmailAccountsQuery();
  const feedQuery = useEmailActivityFeedQuery({
    accountId: accountId === ALL ? undefined : accountId,
    actorType: actorType === 'all' ? undefined : actorType,
  });

  const slugs = useMemo(
    () => new Map((accountsQuery.data ?? []).map((a) => [a.id, getEmailAccountSlug(a)])),
    [accountsQuery.data]
  );
  const items = useMemo(
    () => clubTriageActivity(feedQuery.data?.pages.flatMap((page) => page.items) ?? []),
    [feedQuery.data]
  );
  const threadHref = (item: EmailActivity) => {
    const slug = slugs.get(item.accountId);
    return slug ? buildMailPath(slug, 'inbox', item.conversationKey) : null;
  };

  return (
    <section aria-label="Email activity" className="flex min-h-0 flex-1 flex-col bg-mail-pane">
      <div className="flex flex-wrap items-center gap-2 border-b border-mail-pane-line px-4 py-3">
        <h2 className="mr-auto text-sm font-semibold text-mail-ink">Activity</h2>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger size="sm" className="w-52" aria-label="Mailbox">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All mailboxes</SelectItem>
            {(accountsQuery.data ?? []).map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.nickname || account.displayName || account.mailboxAddress}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={actorType}
          onValueChange={(value) => setActorType(value as typeof actorType)}
        >
          <SelectTrigger size="sm" className="w-36" aria-label="Who">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="human">People</SelectItem>
            <SelectItem value="agent">Elliot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {feedQuery.isError ? (
          <QueryErrorState
            title="Couldn’t load activity"
            onRetry={() => void feedQuery.refetch()}
            className="m-6"
          />
        ) : feedQuery.isPending ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-mail-muted">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Loading activity…
          </p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-mail-muted">
            Nothing has been done from mail here yet.
          </p>
        ) : (
          <div className="mx-auto w-full max-w-3xl py-2">
            {groupActivityByDay(items).map((group) => (
              <div key={group.label}>
                <h3 className="px-4 pb-1 pt-4 text-xs font-semibold text-mail-mid">
                  {group.label}
                </h3>
                <ul className="divide-y divide-mail-hair">
                  {group.items.map((item) => (
                    <EmailActivityFeedRow key={item.id} item={item} threadHref={threadHref(item)} />
                  ))}
                </ul>
              </div>
            ))}
            {feedQuery.hasNextPage && (
              <div className="flex justify-center py-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={feedQuery.isFetchingNextPage}
                  onClick={() => void feedQuery.fetchNextPage()}
                >
                  {feedQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
