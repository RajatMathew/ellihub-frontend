import { useMemo, useState } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import {
  useEmailAccountsQuery,
  useEmailMessageSearchQuery,
  useEmailMessagesQuery,
} from '@/modules/email/hooks';
import type { TaskEmailReference } from '@/modules/tasks/schemas/task.schema';
import { Loader2, Mail, Plus, X } from 'lucide-react';

/**
 * The emails a task is raised from, as removable chips plus a picker.
 *
 * A task usually starts from the message you have open, but the reason for it
 * is often spread over several threads. So the open message is only ever the
 * first chip, and the rest of the mailbox is one click away.
 */

// Long enough that typing a word does not fire a search per keystroke — the
// provider is behind this, not just our cache — and short enough that a pause
// still feels like it answered immediately.
const SEARCH_DEBOUNCE_MS = 350;

// One screenful and a bit. The list is scrollable, and anything older than this
// is what the search box is for.
const RECENT_LIMIT = 25;

/**
 * What the picker needs of an email, from either of the two places it can come
 * from. The search endpoint and the folder listing describe a message
 * differently; the rows below should not have to care which one they came from.
 */
type PickerEmail = {
  providerId: string;
  conversationKey: string | null;
  threadId: string | null;
  subject: string | null;
  senderName: string | null;
  senderEmail: string | null;
};

function labelFor(reference: TaskEmailReference) {
  return reference.subject?.trim() || reference.fromEmail?.trim() || 'Linked email';
}

export function TaskEmailReferences({
  accountId,
  value,
  onChange,
  requireAtLeastOne = false,
}: {
  /**
   * The mailbox to browse. Given from a message — the task came from there, and
   * that is the one to search. Omitted from the board's dialog, which has no
   * open message to take it from; there the mailbox becomes a choice, because
   * guessing one silently searches the wrong mail with no way to say so.
   */
  accountId?: string;
  value: TaskEmailReference[];
  onChange: (next: TaskEmailReference[]) => void;
  /** Raised from a mailbox, where a task with no email would lose its provenance. */
  requireAtLeastOne?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);

  // Only consulted when the host did not name a mailbox. Cheap either way: the
  // mailbox has already loaded and cached this.
  const accountsQuery = useEmailAccountsQuery();
  const accounts = useMemo(
    () => (accountsQuery.data ?? []).filter((account) => account.status === 'CONNECTED'),
    [accountsQuery.data]
  );

  const [chosenAccountId, setChosenAccountId] = useState<string | null>(null);
  const activeAccountId = accountId ?? chosenAccountId ?? accounts[0]?.id;

  // A mailbox is only a choice where one was not handed down, and only worth
  // offering when there is more than one to choose between.
  const canChooseMailbox = !accountId && accounts.length > 1;

  const searching = debouncedTerm.trim().length > 0;

  // Opening the picker used to show a sentence asking you to search, which made
  // typing the price of attaching anything at all. The inbox is what you almost
  // always want, so it is what you get; search narrows it (#861).
  const recentQuery = useEmailMessagesQuery(
    activeAccountId,
    { key: 'inbox' },
    { size: RECENT_LIMIT },
    open
  );
  const searchQuery = useEmailMessageSearchQuery(activeAccountId, debouncedTerm, open);

  const recent = useMemo<PickerEmail[]>(
    () =>
      (recentQuery.data?.pages ?? []).flatMap((page) =>
        page.records.flatMap((message) =>
          // Both are `NOT NULL` on EmailMessageCache, so this never drops a real
          // message — the list schema types them optional and TypeScript has to
          // be answered. A row going missing here would be a bug upstream, not a
          // case to handle.
          message.providerId
            ? [
                {
                  providerId: message.providerId,
                  conversationKey: message.conversationKey ?? null,
                  threadId: message.threadId ?? null,
                  subject: message.subject,
                  senderName: message.senderName,
                  senderEmail: message.senderEmail,
                },
              ]
            : []
        )
      ),
    [recentQuery.data]
  );

  const found = useMemo<PickerEmail[]>(
    () =>
      (searchQuery.data ?? []).map((result) => ({
        providerId: result.providerId,
        conversationKey: result.conversationKey,
        threadId: result.threadId ?? null,
        subject: result.subject,
        senderName: result.senderName,
        senderEmail: result.senderEmail,
      })),
    [searchQuery.data]
  );

  // One list, two sources. The rows below are the same rows either way, so they
  // are written once and fed whichever source is in play.
  const results = searching ? found : recent;
  const isLoading = searching ? searchQuery.isLoading : recentQuery.isLoading;
  const isError = searching ? searchQuery.isError : recentQuery.isError;

  const selectedIds = useMemo(
    () => new Set(value.map((reference) => reference.providerId)),
    [value]
  );

  const isLocked = requireAtLeastOne && value.length <= 1;

  // Clearing stops at the floor rather than ignoring it: where one is required
  // it keeps the first, so the control is never a way around the rule the chip's
  // own remove button enforces. Nothing left to clear disables it.
  const canClear = value.length > (requireAtLeastOne ? 1 : 0);

  const toggle = (providerId: string, build: () => TaskEmailReference) => {
    if (selectedIds.has(providerId)) {
      // Unticking the last one would leave the task with no provenance, which
      // is the one thing this list is for.
      if (requireAtLeastOne && value.length <= 1) return;
      onChange(value.filter((reference) => reference.providerId !== providerId));
      return;
    }
    onChange([...value, build()]);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((reference) => {
          const label = labelFor(reference);
          const locked = isLocked;
          const remove = (
            <button
              type="button"
              disabled={locked}
              aria-label={`Remove ${label}`}
              className="rounded-xs opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30"
              onClick={() =>
                onChange(value.filter((item) => item.providerId !== reference.providerId))
              }
            >
              <X aria-hidden className="size-3" />
            </button>
          );

          return (
            <Badge
              key={reference.providerId}
              variant="secondary"
              appearance="light"
              size="sm"
              className="max-w-52 gap-1 rounded-sm font-sans normal-case tracking-normal"
            >
              <Mail aria-hidden className="size-3 shrink-0" />
              <span className="truncate">{label}</span>
              {locked ? (
                // Disabled controls do not fire pointer events, so the reason
                // has to sit on a wrapper or it can never be read.
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">{remove}</span>
                  </TooltipTrigger>
                  <TooltipContent variant="light" side="bottom">
                    A task raised from an email keeps at least one
                  </TooltipContent>
                </Tooltip>
              ) : (
                remove
              )}
            </Badge>
          );
        })}

        <Popover open={open} onOpenChange={setOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Attach another email"
                  disabled={!activeAccountId}
                  className="size-6 shrink-0 p-0"
                >
                  <Plus aria-hidden className="size-3" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent variant="light" side="bottom">
              Attach another email
            </TooltipContent>
          </Tooltip>

          <PopoverContent align="start" className="w-80 p-0">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="text-xs font-medium">Add inbox threads</p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  disabled={!canClear}
                  onClick={() => onChange(requireAtLeastOne ? value.slice(0, 1) : [])}
                >
                  Clear all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>

            {/* The server already decided what matches — re-filtering here would
                hide results whose match was in a field we do not render. */}
            {/* Only where the host left the mailbox open, and only with more
                than one to pick from. A select naming a single account would be
                a control that cannot do anything. */}
            {canChooseMailbox ? (
              <div className="border-b border-border px-3 py-2">
                <Select
                  value={activeAccountId ?? undefined}
                  onValueChange={(next) => {
                    setChosenAccountId(next);
                    setTerm('');
                  }}
                >
                  <SelectTrigger size="sm" className="w-full text-xs">
                    <SelectValue placeholder="Choose a mailbox" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id} className="text-xs">
                        {account.nickname || account.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <Command shouldFilter={false}>
              <CommandInput
                value={term}
                onValueChange={setTerm}
                placeholder="Search subject or sender"
              />
              {/* A fixed height, not a max: the panel used to grow as results
                  arrived, and Radix repositioned it mid-typing so the whole
                  thing jumped up the screen under the cursor. Same size empty or
                  full means it stays where it opened. */}
              <CommandList className="h-64">
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                    {searching ? 'Searching…' : 'Loading your mail…'}
                  </div>
                ) : isError ? (
                  <div className="px-3 py-6 text-center text-xs text-destructive">
                    {searching
                      ? 'Couldn’t search your mail. Try again.'
                      : 'Couldn’t load your mail. Try again.'}
                  </div>
                ) : (
                  <>
                    {/* Two different nothings: a search that matched none, and an
                        inbox with none to offer. */}
                    <CommandEmpty>
                      {searching ? 'No matching emails.' : 'Nothing in your inbox to attach.'}
                    </CommandEmpty>
                    {results.map((result) => {
                      const checked = selectedIds.has(result.providerId);
                      const lockedItem = checked && requireAtLeastOne && value.length <= 1;

                      return (
                        <CommandItem
                          key={result.providerId}
                          value={result.providerId}
                          disabled={lockedItem}
                          className={cn('items-start gap-2', lockedItem && 'opacity-60')}
                          onSelect={() =>
                            toggle(result.providerId, () => ({
                              // The reference carries the mailbox it came from,
                              // so switching mailboxes mid-pick keeps each chip
                              // pointing at its own.
                              accountId: activeAccountId as string,
                              providerId: result.providerId,
                              conversationKey: result.conversationKey,
                              threadId: result.threadId,
                              subject: result.subject,
                              fromEmail: result.senderEmail,
                            }))
                          }
                        >
                          {/* Presentational: CommandItem owns the click, and a
                              focusable checkbox inside it would be a second tab
                              stop that does the same thing. */}
                          <Checkbox
                            checked={checked}
                            tabIndex={-1}
                            aria-hidden
                            className="pointer-events-none mt-0.5"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">
                              {result.subject || '(No subject)'}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {result.senderName || result.senderEmail}
                            </span>
                          </span>
                        </CommandItem>
                      );
                    })}
                  </>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
