import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Button } from '@/app/components/ui/button';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import { VirtualizedEmailList } from '@/modules/email/components/virtualized-email-list';
import { getEmailFolderLabel } from '@/modules/email/constants/email-folders';
import emailData from '@/modules/email/data/emails.json';
import { ChevronLeft, ChevronRight, Inbox, RefreshCcw, Search, X } from 'lucide-react';

interface EmailListPaneProps {
  mailbox: string;
  folder: string;
  folderLabel?: string;
  emails?: EmailListItem[];
  isLoading?: boolean;
  isError?: boolean;
  selectedEmailId?: string;
  page?: number;
  pageSize?: number;
  totalCount?: number | null;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
  isPageChanging?: boolean;
  isRefreshing?: boolean;
  groupByMonth?: boolean;
  search?: string;
  onSelectEmail?: (emailId: string) => void;
  onPreviousPage?: () => void;
  onNextPage?: () => void;
  onRetry?: () => void;
  onSearchChange?: (value: string) => void;
}

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 280;
const MAX_WIDTH = 420;
const fallbackEmails = emailData as EmailListItem[];

export function EmailListPane({
  mailbox,
  folder,
  folderLabel: folderLabelProp,
  emails,
  isLoading = false,
  isError = false,
  selectedEmailId,
  page,
  pageSize,
  totalCount,
  hasPreviousPage = false,
  hasNextPage = false,
  isPageChanging = false,
  isRefreshing = false,
  groupByMonth = false,
  search: controlledSearch,
  onSelectEmail,
  onPreviousPage,
  onNextPage,
  onRetry,
  onSearchChange,
}: EmailListPaneProps) {
  const [localSearch, setLocalSearch] = useState('');
  const search = controlledSearch ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const folderLabel = folderLabelProp ?? getEmailFolderLabel(folder);

  const mailboxEmails = useMemo(
    () =>
      emails ??
      fallbackEmails.filter((email) => email.mailbox === mailbox && email.folder === folder),
    [emails, folder, mailbox]
  );

  const filteredEmails = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query || onSearchChange) return mailboxEmails;

    return mailboxEmails.filter((email) =>
      [email.senderName, email.senderEmail, email.subject, email.preview, email.category]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [mailboxEmails, onSearchChange, search]);
  const emailRangeLabel = getEmailRangeLabel({
    count: mailboxEmails.length,
    page,
    pageSize,
    totalCount,
    hasNextPage,
    hasSearch: Boolean(search.trim()),
  });

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [folder, mailbox, page, search]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const startX = event.clientX;
    const startWidth = width;
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX)
      );
      setWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <section
      className={cn(
        'relative flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-r border-border bg-background',
        !isResizing &&
          'motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out',
        'motion-reduce:transition-none'
      )}
      style={{ width }}
      aria-label={`${folderLabel} email list`}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="min-w-0">
          <h1 className="truncate font-sans text-base font-semibold normal-case tracking-normal text-foreground">
            {folderLabel}
          </h1>
          <p className="whitespace-nowrap text-xs text-muted-foreground">{emailRangeLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              mode="icon"
              size="icon"
              className="size-8"
              disabled={isLoading || isRefreshing}
              aria-busy={isRefreshing}
              aria-label="Refresh emails"
              onClick={onRetry}
            >
              <RefreshCcw
                aria-hidden="true"
                className={cn('size-4', isRefreshing && 'motion-safe:animate-spin')}
              />
            </Button>
          )}
          {page && (
            <div
              className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5"
              role="group"
              aria-label="Email pagination"
            >
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="icon"
                className="size-8"
                disabled={!hasPreviousPage || isPageChanging}
                aria-label="Previous 100 emails"
                onClick={onPreviousPage}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Button>
              <span className="min-w-5 text-center font-mono text-xs font-medium tabular-nums text-foreground">
                {page}
              </span>
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="icon"
                className="size-8"
                disabled={!hasNextPage || isPageChanging}
                aria-label="Next 100 emails"
                onClick={onNextPage}
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-b border-border p-3">
        <label htmlFor="email-list-search" className="sr-only">
          Search emails
        </label>
        <InputWrapper variant="sm" className="h-9 gap-2 px-3">
          <Search aria-hidden="true" className="size-4" />
          <Input
            id="email-list-search"
            type="text"
            enterKeyHint="search"
            value={search}
            placeholder="Search"
            autoComplete="off"
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search emails"
          />
          {search && (
            <button
              type="button"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear email search"
              onClick={() => setSearch('')}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </InputWrapper>
      </div>

      <div ref={scrollContainerRef} className="kt-scrollable-y-auto min-h-0 flex-1">
        {isLoading && <EmailListSkeleton />}

        {!isLoading && isError && <EmailListErrorState onRetry={onRetry} />}

        {!isLoading && !isError && filteredEmails.length === 0 && (
          <EmailListEmptyState
            hasSearch={Boolean(search.trim())}
            folderLabel={folderLabel}
            onClearSearch={() => setSearch('')}
          />
        )}

        {!isLoading && !isError && filteredEmails.length > 0 && (
          <VirtualizedEmailList
            key={`${mailbox}:${folder}:${search}`}
            emails={filteredEmails}
            scrollContainerRef={scrollContainerRef}
            selectedEmailId={selectedEmailId}
            groupByMonth={groupByMonth}
            onSelectEmail={onSelectEmail}
          />
        )}
      </div>

      <button
        type="button"
        className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none border-r border-transparent hover:border-primary/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
        aria-label="Resize email list"
        onPointerDown={handleResizeStart}
      />
    </section>
  );
}

const emailCountFormatter = new Intl.NumberFormat();

function getEmailRangeLabel({
  count,
  page,
  pageSize,
  totalCount,
  hasNextPage,
  hasSearch,
}: {
  count: number;
  page?: number;
  pageSize?: number;
  totalCount?: number | null;
  hasNextPage: boolean;
  hasSearch: boolean;
}) {
  if (!page || !pageSize) return `${emailCountFormatter.format(count)} emails`;
  const suffix = hasSearch ? 'results' : 'emails';
  if (count === 0 || totalCount === 0) return `0 ${suffix}`;

  const start = (page - 1) * pageSize + 1;
  const end =
    totalCount !== null && totalCount !== undefined
      ? Math.min(page * pageSize, totalCount)
      : hasNextPage
        ? page * pageSize
        : start + Math.max(0, count - 1);
  if (totalCount !== null && totalCount !== undefined) {
    return `${emailCountFormatter.format(start)}–${emailCountFormatter.format(end)} of ${emailCountFormatter.format(totalCount)} ${suffix}`;
  }
  return `${emailCountFormatter.format(start)}–${emailCountFormatter.format(end)} ${suffix}`;
}

function EmailListSkeleton() {
  return (
    <div className="space-y-0" aria-label="Loading emails">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border-b border-border px-3 py-4">
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
