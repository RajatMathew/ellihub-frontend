import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { EmailRowCard, type EmailListItem } from '@/modules/email/components/email-row-card';
import { getEmailFolderLabel, type EmailFolderKey } from '@/modules/email/constants/email-folders';
import type { EmailMailboxKey } from '@/modules/email/constants/email-mailboxes';
import emailData from '@/modules/email/data/emails.json';
import { Inbox, RefreshCcw, Search, X } from 'lucide-react';

interface EmailListPaneProps {
  mailbox: EmailMailboxKey;
  folder: EmailFolderKey;
  emails?: EmailListItem[];
  isLoading?: boolean;
  isError?: boolean;
  selectedEmailId?: string;
  onSelectEmail?: (emailId: string) => void;
  onRetry?: () => void;
}

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 280;
const MAX_WIDTH = 420;
const fallbackEmails = emailData as EmailListItem[];

export function EmailListPane({
  mailbox,
  folder,
  emails,
  isLoading = false,
  isError = false,
  selectedEmailId,
  onSelectEmail,
  onRetry,
}: EmailListPaneProps) {
  const [search, setSearch] = useState('');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const folderLabel = getEmailFolderLabel(folder);

  const mailboxEmails = useMemo(
    () =>
      emails ??
      fallbackEmails.filter((email) => email.mailbox === mailbox && email.folder === folder),
    [emails, folder, mailbox]
  );

  const filteredEmails = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return mailboxEmails;

    return mailboxEmails.filter((email) =>
      [email.senderName, email.senderEmail, email.subject, email.preview, email.category]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [mailboxEmails, search]);

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
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold text-foreground">{folderLabel}</h1>
          <p className="text-xs text-muted-foreground">{mailboxEmails.length} emails</p>
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
            type="search"
            value={search}
            placeholder="Search"
            autoComplete="off"
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search emails"
          />
          {search && (
            <button
              type="button"
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Clear email search"
              onClick={() => setSearch('')}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </InputWrapper>
      </div>

      <div className="kt-scrollable-y-auto min-h-0 flex-1">
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
          <div>
            {filteredEmails.map((email) => (
              <EmailRowCard
                key={email.id}
                email={email}
                selected={email.id === selectedEmailId}
                onSelect={() => onSelectEmail?.(email.id)}
              />
            ))}
          </div>
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
