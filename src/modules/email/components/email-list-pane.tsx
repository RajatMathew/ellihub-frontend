import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmailBulkActionBar } from '@/modules/email/components/email-bulk-action-bar';
import { EmailListScrollbar } from '@/modules/email/components/email-list-scrollbar';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { VirtualizedEmailList } from '@/modules/email/components/virtualized-email-list';
import { getEmailFolderLabel } from '@/modules/email/constants/email-folders';
import { Inbox, RefreshCcw } from 'lucide-react';

interface EmailListPaneProps {
  accountId?: string;
  mailbox: string;
  folder: string;
  folderLabel?: string;
  emails: EmailListItem[];
  isLoading?: boolean;
  isError?: boolean;
  selectedEmailId?: string;
  totalCount?: number | null;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  loadMoreError?: boolean;
  groupByMonth?: boolean;
  search?: string;
  /**
   * The term rows draw a highlight for. Defaults to `search`, but callers whose
   * search is debounced should pass the settled term: the highlight is the only
   * thing in a row that depends on it, and re-rendering every visible row on
   * every keystroke to move a `<mark>` is what made typing here feel heavy.
   */
  highlightQuery?: string;
  /**
   * When true, automatically fetch further pages while the current page(s)
   * produced zero visible emails but more are available server-side. This
   * covers client-side "Show messages" filters (e.g. "with attachments"):
   * a filter can legitimately have zero matches in the pages loaded so far
   * even though later pages contain matches, which otherwise reads as an
   * empty folder and silently stalls pagination (the load-more sentinel
   * below only renders once there's something to scroll past). Applies to
   * personal and shared mailboxes alike — both drive this same list pane.
   */
  autoFetchWhileEmpty?: boolean;
  onSelectEmail?: (emailId: string) => void;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onSearchChange?: (value: string) => void;
  onArchiveEmail?: (email: EmailListItem) => void;
  onDeleteEmail?: (email: EmailListItem) => void;
  onToggleFlagEmail?: (email: EmailListItem) => void;
  onTogglePinEmail?: (email: EmailListItem) => void;

  /**
   * Bulk-selection wiring. When any callback is provided the list renders
   * checkboxes on each row and shows the bulk-action bar at the top.
   */
  checkedIds?: Set<string>;
  onToggleChecked?: (email: EmailListItem, next: boolean, options?: { range?: boolean }) => void;
  onToggleCheckedAll?: () => void;
  onClearChecked?: () => void;
  onBulkArchive?: () => void;
  onBulkDelete?: () => void;
  isBulkMutating?: boolean;
  /**
   * Bulk-action labels. Callers viewing Deleted Items pass "Restore" and
   * "Delete forever" so the button copy matches the destructive intent.
   */
  bulkArchiveLabel?: string;
  bulkDeleteLabel?: string;
  bulkArchiveVariant?: 'archive' | 'restore';
}

export function EmailListPane({
  accountId,
  mailbox,
  folder,
  folderLabel: folderLabelProp,
  emails,
  isLoading = false,
  isError = false,
  selectedEmailId,
  totalCount,
  hasNextPage = false,
  isLoadingMore = false,
  loadMoreError = false,
  groupByMonth = false,
  search: controlledSearch,
  highlightQuery,
  autoFetchWhileEmpty = false,
  onSelectEmail,
  onLoadMore,
  onRetry,
  onSearchChange,
  onArchiveEmail,
  onDeleteEmail,
  onToggleFlagEmail,
  onTogglePinEmail,
  checkedIds,
  onToggleChecked,
  onToggleCheckedAll,
  onClearChecked,
  onBulkArchive,
  onBulkDelete,
  isBulkMutating = false,
  bulkArchiveLabel = 'Archive',
  bulkDeleteLabel = 'Delete',
  bulkArchiveVariant = 'archive',
}: EmailListPaneProps) {
  const [localSearch, setLocalSearch] = useState('');
  const search = controlledSearch ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const folderLabel = folderLabelProp ?? getEmailFolderLabel(folder);

  const mailboxEmails = useMemo(() => emails, [emails]);

  const filteredEmails = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query || onSearchChange) return mailboxEmails;

    return mailboxEmails.filter((email) =>
      [email.senderName, email.senderEmail, email.subject, email.preview, email.category]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [mailboxEmails, onSearchChange, search]);
  const emailCountLabel = getEmailCountLabel({
    count: mailboxEmails.length,
    totalCount,
    hasNextPage,
    hasSearch: Boolean(search.trim()),
  });

  useEffect(() => {
    scrollContainer?.scrollTo({ top: 0 });
  }, [folder, mailbox, scrollContainer, search]);

  /**
   * Paging state read at the moment the sentinel is seen, rather than captured
   * when the observer was built.
   *
   * Putting these in the effect's dependencies instead tore the observer down
   * and rebuilt it on every state flip, and re-observing a sentinel that is
   * still on screen fires the callback again immediately — so finishing one
   * page could start the next without the reader having moved. The observer is
   * now built once per scroll container and consults this.
   */
  const pagingRef = useRef({ hasNextPage, isLoadingMore, loadMoreError, onLoadMore });
  useEffect(() => {
    pagingRef.current = { hasNextPage, isLoadingMore, loadMoreError, onLoadMore };
  }, [hasNextPage, isLoadingMore, loadMoreError, onLoadMore]);

  useEffect(() => {
    const root = scrollContainer;
    if (!root) return;

    // `rootMargin: 0` — the next page is asked for when the end of the list is
    // actually reached, not before it.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        const paging = pagingRef.current;
        if (!paging.hasNextPage || paging.isLoadingMore || paging.loadMoreError) return;
        paging.onLoadMore?.();
      },
      { root, rootMargin: '0px' }
    );

    // The sentinel mounts and unmounts with the list, so it is watched rather
    // than observed once: an observer bound to a detached node silently never
    // fires again.
    let observed: Element | null = null;
    const attach = () => {
      const sentinel = loadMoreSentinelRef.current;
      if (sentinel === observed) return;
      if (observed) observer.unobserve(observed);
      observed = sentinel;
      if (sentinel) observer.observe(sentinel);
    };

    attach();
    const listWatcher = new MutationObserver(attach);
    listWatcher.observe(root, { childList: true, subtree: true });

    return () => {
      listWatcher.disconnect();
      observer.disconnect();
    };
  }, [scrollContainer]);

  // A filter can have zero matches among the pages loaded so far while more
  // pages remain server-side. The load-more sentinel above only mounts once
  // the list has at least one row, so it can never fire from a filtered-empty
  // state — keep paging automatically instead of stalling.
  useEffect(() => {
    if (!autoFetchWhileEmpty) return;
    if (isLoading || isError) return;
    if (mailboxEmails.length > 0) return;
    if (!hasNextPage || isLoadingMore || loadMoreError || !onLoadMore) return;

    onLoadMore();
  }, [
    autoFetchWhileEmpty,
    hasNextPage,
    isError,
    isLoading,
    isLoadingMore,
    loadMoreError,
    mailboxEmails.length,
    onLoadMore,
  ]);

  const checkedCount = checkedIds?.size ?? 0;
  const isBulkActive = checkedCount > 0;
  const allInViewChecked =
    isBulkActive &&
    filteredEmails.length > 0 &&
    filteredEmails.every((email) => checkedIds?.has(email.id));

  return (
    <section
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-mail-paper"
      aria-label={`${folderLabel} email list`}
    >
      <div className="sr-only" aria-live="polite">
        {emailCountLabel}
      </div>

      <div className="relative min-h-0 flex-1">
        <EmailListScrollbar scrollElement={scrollContainer} />
        {/*
          The list fades out into the paper at the bottom rather than stopping
          at a hard edge, so a part-scrolled column reads as "there is more"
          without a scrollbar having to say it.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-14 bg-linear-to-t from-mail-paper to-transparent"
        />
        <div
          ref={setScrollContainer}
          className="mail-rows kt-scrollable-y-auto scrollbar-hover h-full pb-8 pt-0.5"
        >
          {isLoading && <EmailListSkeleton />}

          {!isLoading && isError && <EmailListErrorState onRetry={onRetry} />}

          {!isLoading &&
            !isError &&
            filteredEmails.length === 0 &&
            (autoFetchWhileEmpty && hasNextPage ? (
              <div
                className="flex min-h-16 items-center justify-center px-4 py-3"
                role="status"
                aria-live="polite"
              >
                <div
                  className="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground motion-reduce:animate-none"
                  aria-label="Searching more emails"
                />
              </div>
            ) : (
              <EmailListEmptyState
                hasSearch={Boolean(search.trim())}
                folderLabel={folderLabel}
                onClearSearch={() => setSearch('')}
              />
            ))}

          {!isLoading && !isError && filteredEmails.length > 0 && scrollContainer && (
            <VirtualizedEmailList
              accountId={accountId}
              key={`${mailbox}:${folder}:${search}`}
              emails={filteredEmails}
              scrollElement={scrollContainer}
              selectedEmailId={selectedEmailId}
              groupByMonth={groupByMonth}
              highlightQuery={highlightQuery ?? search}
              onSelectEmail={onSelectEmail}
              onArchiveEmail={onArchiveEmail}
              onDeleteEmail={onDeleteEmail}
              onToggleFlagEmail={onToggleFlagEmail}
              onTogglePinEmail={onTogglePinEmail}
              checkedIds={checkedIds}
              onToggleChecked={onToggleChecked}
              bulkSelectActive={isBulkActive}
            />
          )}

          {!isLoading && !isError && filteredEmails.length > 0 && hasNextPage && (
            <div
              ref={loadMoreSentinelRef}
              className="flex min-h-16 items-center justify-center px-4 py-3"
              aria-live="polite"
            >
              {loadMoreError ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-xs text-muted-foreground">Couldn’t load more emails.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onLoadMore?.()}
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <div
                  className="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground motion-reduce:animate-none"
                  role="status"
                  aria-label={isLoadingMore ? 'Loading more emails' : 'Preparing more emails'}
                />
              )}
            </div>
          )}
        </div>

        {isBulkActive && onToggleChecked && (
          <EmailBulkActionBar
            checkedCount={checkedCount}
            allInViewChecked={allInViewChecked}
            isBulkMutating={isBulkMutating}
            bulkArchiveLabel={bulkArchiveLabel}
            bulkArchiveVariant={bulkArchiveVariant}
            bulkDeleteLabel={bulkDeleteLabel}
            onToggleCheckedAll={onToggleCheckedAll}
            onBulkArchive={onBulkArchive}
            onBulkDelete={onBulkDelete}
            onClearChecked={onClearChecked}
          />
        )}
      </div>
    </section>
  );
}

const emailCountFormatter = new Intl.NumberFormat();

function getEmailCountLabel({
  count,
  totalCount,
  hasNextPage,
  hasSearch,
}: {
  count: number;
  totalCount?: number | null;
  hasNextPage: boolean;
  hasSearch: boolean;
}) {
  const suffix = hasSearch ? 'results' : 'emails';
  if (count === 0 || totalCount === 0) return `0 ${suffix}`;

  if (totalCount !== null && totalCount !== undefined) {
    return `${emailCountFormatter.format(totalCount)} ${suffix}`;
  }
  return `${emailCountFormatter.format(count)}${hasNextPage ? '+' : ''} ${suffix}`;
}

function EmailListSkeleton() {
  return (
    <div className="px-3 pt-2" aria-label="Loading emails">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="mb-1 flex gap-[11px] rounded-[10px] px-2.5 py-[13px]">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmailListEmptyState({
  hasSearch,
  folderLabel,
  onClearSearch,
}: {
  hasSearch: boolean;
  folderLabel: string;
  onClearSearch: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
      <Inbox aria-hidden="true" className="size-9 text-mail-muted" strokeWidth={1.8} />
      <p className="mt-4 font-serif text-lg text-mail-ink">
        {hasSearch ? 'No emails found' : `${folderLabel} is empty`}
      </p>
      <p className="mt-1 max-w-56 text-[13px] leading-6 text-mail-muted">
        {hasSearch
          ? 'Try another sender, subject, or project keyword.'
          : 'Messages for this folder will appear here.'}
      </p>
      {hasSearch && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={onClearSearch}
        >
          Clear search
        </Button>
      )}
    </div>
  );
}

function EmailListErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
      <RefreshCcw aria-hidden="true" className="size-9 text-mail-muted" strokeWidth={1.8} />
      <p className="mt-4 font-serif text-lg text-mail-ink">Could not load emails</p>
      <p className="mt-1 max-w-56 text-[13px] leading-6 text-mail-muted">
        This mailbox did not respond. Try again in a moment.
      </p>
      <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
