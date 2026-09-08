import { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Skeleton } from '@/app/components/ui/skeleton';
import { EmailListScrollbar } from '@/modules/email/components/email-list-scrollbar';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { VirtualizedEmailList } from '@/modules/email/components/virtualized-email-list';
import { getEmailFolderLabel } from '@/modules/email/constants/email-folders';
import { Archive, ArchiveRestore, Inbox, RefreshCcw, Trash2, X } from 'lucide-react';

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
  onPrefetchEmail?: (email: EmailListItem) => void;
  onArchiveEmail?: (email: EmailListItem) => void;
  onDeleteEmail?: (email: EmailListItem) => void;
  onToggleFlagEmail?: (email: EmailListItem) => void;

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
  autoFetchWhileEmpty = false,
  onSelectEmail,
  onLoadMore,
  onRetry,
  onSearchChange,
  onPrefetchEmail,
  onArchiveEmail,
  onDeleteEmail,
  onToggleFlagEmail,
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

  useEffect(() => {
    const root = scrollContainer;
    const sentinel = loadMoreSentinelRef.current;
    if (!root || !sentinel || !hasNextPage || isLoadingMore || loadMoreError || !onLoadMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMore();
      },
      { root, rootMargin: '320px 0px' }
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasNextPage, isLoadingMore, loadMoreError, onLoadMore, scrollContainer]);

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
      className="relative flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background lg:w-96"
      aria-label={`${folderLabel} email list`}
    >
      <div className="sr-only" aria-live="polite">
        {emailCountLabel}
      </div>

      {isBulkActive && onToggleChecked && (
        <div className="flex min-w-0 items-center gap-2 border-b border-border bg-muted/30 px-2 py-2">
          <label className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-foreground">
            <Checkbox
              checked={allInViewChecked}
              onCheckedChange={() => onToggleCheckedAll?.()}
              disabled={isBulkMutating}
              aria-label={allInViewChecked ? 'Deselect all visible' : 'Select all visible'}
            />
            {checkedCount}
          </label>
          <div className="ml-auto flex items-center gap-0.5">
            {onBulkArchive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 whitespace-nowrap px-1.5 text-xs"
                onClick={onBulkArchive}
                disabled={isBulkMutating}
                title={bulkArchiveLabel}
              >
                {bulkArchiveVariant === 'restore' ? (
                  <ArchiveRestore aria-hidden="true" className="size-3.5" />
                ) : (
                  <Archive aria-hidden="true" className="size-3.5" />
                )}
                {bulkArchiveLabel}
              </Button>
            )}
            {onBulkDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 whitespace-nowrap px-1.5 text-xs text-destructive hover:text-destructive"
                onClick={onBulkDelete}
                disabled={isBulkMutating}
                title={bulkDeleteLabel}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                {bulkDeleteLabel}
              </Button>
            )}
            {onClearChecked && (
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="sm"
                className="size-8 shrink-0"
                onClick={onClearChecked}
                disabled={isBulkMutating}
                aria-label="Clear selection"
              >
                <X aria-hidden="true" className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <EmailListScrollbar scrollElement={scrollContainer} />
        <div ref={setScrollContainer} className="kt-scrollable-y-auto scrollbar-hover h-full">
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
              highlightQuery={search}
              onSelectEmail={onSelectEmail}
              onPrefetchEmail={onPrefetchEmail}
              onArchiveEmail={onArchiveEmail}
              onDeleteEmail={onDeleteEmail}
              onToggleFlagEmail={onToggleFlagEmail}
              checkedIds={checkedIds}
              onToggleChecked={onToggleChecked}
              bulkSelectActive={isBulkActive}
            />
          )}

          {!isLoading && !isError && filteredEmails.length > 0 && hasNextPage && (
            <div
              ref={loadMoreSentinelRef}
              className="flex min-h-16 items-center justify-center border-t border-border px-4 py-3"
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
    <div className="space-y-2 p-3" aria-label="Loading emails">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-md border border-border bg-background px-3 py-3">
          <div className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
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
      <Inbox aria-hidden="true" className="size-9 text-muted-foreground" strokeWidth={1.8} />
      <p className="mt-4 text-sm font-semibold text-foreground">
        {hasSearch ? 'No emails found' : `${folderLabel} is empty`}
      </p>
      <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">
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
      <RefreshCcw aria-hidden="true" className="size-9 text-muted-foreground" strokeWidth={1.8} />
      <p className="mt-4 text-sm font-semibold text-foreground">Could not load emails</p>
      <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">
        This mailbox did not respond. Try again in a moment.
      </p>
      <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
