import { useMemo, useState } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useResetOnChange } from '@/app/hooks/use-reset-on-change';
import type { PendingDiscovery } from '@/modules/settings/api/shared-mailboxes.api';
import { AlertCircle, LoaderCircle, Mailbox } from 'lucide-react';

type Props = {
  open: boolean;
  scope: 'vendor' | 'personal';
  discovery: PendingDiscovery | undefined;
  isLoading: boolean;
  isError: boolean;
  isConfirming: boolean;
  onConfirm: (emailAddresses: string[]) => void;
  onSkip: () => void;
  onDismiss: () => void;
};

const COPY = {
  vendor: {
    title: 'Add common inboxes',
    description:
      'These are the shared mailboxes your vendor account can reach. Pick the ones everyone in your organization should see.',
    allAvailableDescription:
      'Every shared mailbox this vendor account can reach is already in Common.',
    emptyTitle: 'No shared mailboxes to add',
    emptyDescription:
      'This vendor account did not surface any accessible shared mailboxes. You can retry later or connect another account.',
    confirm: 'Add to common inboxes',
    skip: 'Skip for now',
  },
  personal: {
    title: 'Add shared inboxes you have access to',
    description:
      'We found shared mailboxes you can reach through your personal account. Tick any you want to add — these will only be visible to you.',
    allAvailableDescription:
      "You already have access to every shared mailbox we found — they're all in Common.",
    emptyTitle: 'No extra shared mailboxes to add',
    emptyDescription: 'You already see every shared mailbox available through this account.',
    confirm: 'Add selected',
    skip: 'Skip',
  },
} as const;

export function SharedMailboxDiscoveryModal({
  open,
  scope,
  discovery,
  isLoading,
  isError,
  isConfirming,
  onConfirm,
  onSkip,
  onDismiss,
}: Props) {
  const copy = COPY[scope];
  const candidates = useMemo(() => discovery?.candidates ?? [], [discovery?.candidates]);
  const newCandidates = useMemo(
    () => candidates.filter((candidate) => !candidate.alreadyAvailable),
    [candidates]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Everything new is selected by default, re-seeded when the candidate set
  // itself changes. Keyed on the addresses rather than on `newCandidates`, whose
  // identity changes on every refetch: the effect this replaces re-ran then too,
  // so a background refetch returning the same mailboxes silently discarded
  // whatever the user had just ticked.
  useResetOnChange(
    // JSON rather than a joined string: unambiguous, and no separator to pick
    // that an address might contain.
    JSON.stringify(
      discovery?.status === 'ready'
        ? newCandidates.map((candidate) => candidate.emailAddress)
        : null
    ),
    () => {
      if (discovery?.status !== 'ready') return;
      setSelected(new Set(newCandidates.map((candidate) => candidate.emailAddress)));
    }
  );

  const isDiscovering = isLoading || discovery?.status === 'discovering';
  const hasError = isError || discovery?.status === 'error';
  const isReady = discovery?.status === 'ready';
  const hasNewCandidates = newCandidates.length > 0;
  const onlyAlreadyAvailable = isReady && !hasNewCandidates && candidates.length > 0;
  const isEmptyReady = isReady && candidates.length === 0;
  const allSelected = hasNewCandidates && selected.size === newCandidates.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(newCandidates.map((candidate) => candidate.emailAddress)));
    }
  };

  const toggleOne = (emailAddress: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(emailAddress)) next.delete(emailAddress);
      else next.add(emailAddress);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!hasNewCandidates) {
      onSkip();
      return;
    }
    onConfirm(Array.from(selected));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isConfirming) onDismiss();
      }}
    >
      <DialogContent
        className="max-w-xl gap-0 p-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
        onOpenAutoFocus={(event) => {
          // Radix would otherwise focus the DialogContent wrapper itself when the
          // dynamic body (loading → ready) unmounts what was previously focused,
          // which triggers the browser's :focus-visible outline around the whole
          // modal. The Continue/Add button below is the natural focus target.
          event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (isConfirming) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isConfirming) event.preventDefault();
        }}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {onlyAlreadyAvailable ? copy.allAvailableDescription : copy.description}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 border-t border-border">
          {isDiscovering ? <DiscoveringState /> : null}
          {hasError ? <ErrorState message={discovery?.errorMessage ?? undefined} /> : null}
          {isEmptyReady ? (
            <EmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
          ) : null}
          {isReady && candidates.length > 0 ? (
            <CandidateList
              candidates={candidates}
              selected={selected}
              allSelected={allSelected}
              hasNewCandidates={hasNewCandidates}
              onToggleAll={toggleAll}
              onToggleOne={toggleOne}
            />
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
          {hasNewCandidates && (
            <Button type="button" variant="outline" disabled={isConfirming} onClick={onSkip}>
              {copy.skip}
            </Button>
          )}
          <Button
            type="button"
            autoFocus
            disabled={
              isConfirming ||
              isDiscovering ||
              hasError ||
              (isReady && hasNewCandidates && selected.size === 0)
            }
            onClick={handleConfirm}
          >
            {isConfirming ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Adding...
              </>
            ) : hasNewCandidates ? (
              `${copy.confirm}${selected.size > 0 ? ` (${selected.size})` : ''}`
            ) : onlyAlreadyAvailable ? (
              'Continue'
            ) : (
              'Close'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscoveringState() {
  return (
    <div className="flex flex-col gap-3 px-6 py-8">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Scanning shared mailboxes you have access to...
      </div>
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-start gap-2 px-6 py-8">
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle aria-hidden="true" className="size-4" />
        <p className="text-sm font-medium">Couldn&apos;t scan shared mailboxes</p>
      </div>
      <p className="text-sm text-muted-foreground">{summarizeDiscoveryError(message)}</p>
    </div>
  );
}

// Provider errors often come back as JSON blobs — strip those and map to a
// short, actionable line. Anything unexpected falls back to a generic message
// rather than exposing internals to the user.
function summarizeDiscoveryError(raw?: string): string {
  if (!raw) {
    return 'The email provider rejected the directory request. You can retry the connection.';
  }

  const trimmed = raw.trim();
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  const looksLikePermission = /forbidden|denied|access|permission|authoriz|insufficient/i.test(
    trimmed
  );

  if (looksLikeJson || looksLikePermission) {
    return 'This account does not have permission to list the organization directory. Ask an administrator to grant the User.Read.All permission, then reconnect.';
  }

  const firstLine = trimmed.split(/\r?\n/)[0]!;
  return firstLine.length > 240 ? `${firstLine.slice(0, 237).trimEnd()}…` : firstLine;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <Mailbox aria-hidden="true" className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CandidateList({
  candidates,
  selected,
  allSelected,
  hasNewCandidates,
  onToggleAll,
  onToggleOne,
}: {
  candidates: {
    emailAddress: string;
    displayName: string;
    alreadyAvailable: boolean;
  }[];
  selected: Set<string>;
  allSelected: boolean;
  hasNewCandidates: boolean;
  onToggleAll: () => void;
  onToggleOne: (emailAddress: string) => void;
}) {
  const newCount = candidates.filter((candidate) => !candidate.alreadyAvailable).length;

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        {hasNewCandidates ? (
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
            Select all new
          </label>
        ) : (
          <span className="text-sm font-medium text-foreground">All already in Common</span>
        )}
        <span className="text-xs text-muted-foreground">
          {hasNewCandidates
            ? `${selected.size} of ${newCount} to add`
            : `${candidates.length} connected`}
        </span>
      </div>
      <div className="max-h-[26rem] overflow-y-auto">
        <ul className="divide-y divide-border">
          {candidates.map((candidate) => {
            const inputId = `discovery-candidate-${candidate.emailAddress}`;
            const isSelected = candidate.alreadyAvailable
              ? true
              : selected.has(candidate.emailAddress);
            const isDisabled = candidate.alreadyAvailable;
            const RowTag = isDisabled ? 'div' : 'label';
            return (
              <li key={candidate.emailAddress}>
                <RowTag
                  {...(isDisabled ? {} : { htmlFor: inputId })}
                  className={
                    isDisabled
                      ? 'flex items-center gap-3 px-6 py-3'
                      : 'flex cursor-pointer items-center gap-3 px-6 py-3 hover:bg-muted/40'
                  }
                >
                  <Checkbox
                    id={inputId}
                    checked={isSelected}
                    disabled={isDisabled}
                    onCheckedChange={() => !isDisabled && onToggleOne(candidate.emailAddress)}
                    aria-label={
                      isDisabled
                        ? `${candidate.displayName} — already in Common`
                        : `Add ${candidate.displayName}`
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {candidate.displayName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {candidate.emailAddress}
                    </span>
                  </span>
                  {candidate.alreadyAvailable && (
                    <Badge variant="success" appearance="light" className="shrink-0">
                      Already in Common
                    </Badge>
                  )}
                </RowTag>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
