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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { cn } from '@/app/lib/utils';
import { useEmailMessageSearchQuery } from '@/modules/email/hooks';
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

function labelFor(reference: TaskEmailReference) {
  return reference.subject?.trim() || reference.fromEmail?.trim() || 'Linked email';
}

export function TaskEmailReferences({
  accountId,
  value,
  onChange,
  requireAtLeastOne = false,
}: {
  accountId: string;
  value: TaskEmailReference[];
  onChange: (next: TaskEmailReference[]) => void;
  /** Raised from a mailbox, where a task with no email would lose its provenance. */
  requireAtLeastOne?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS);

  const searchQuery = useEmailMessageSearchQuery(accountId, debouncedTerm, open);

  const selectedIds = useMemo(
    () => new Set(value.map((reference) => reference.providerId)),
    [value]
  );

  const isLocked = requireAtLeastOne && value.length <= 1;

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

            {/* The server already decided what matches — re-filtering here would
                hide results whose match was in a field we do not render. */}
            <Command shouldFilter={false}>
              <CommandInput
                value={term}
                onValueChange={setTerm}
                placeholder="Search subject or sender"
              />
              <CommandList className="max-h-64">
                {term.trim().length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Search your mail to attach another thread.
                  </p>
                ) : searchQuery.isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                    <Loader2 aria-hidden className="size-3.5 animate-spin" />
                    Searching…
                  </div>
                ) : searchQuery.isError ? (
                  <div className="px-3 py-6 text-center text-xs text-destructive">
                    Couldn’t search your mail. Try again.
                  </div>
                ) : (
                  <>
                    <CommandEmpty>No matching emails.</CommandEmpty>
                    {(searchQuery.data ?? []).map((result) => {
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
                              accountId,
                              providerId: result.providerId,
                              conversationKey: result.conversationKey ?? null,
                              threadId: result.threadId ?? null,
                              subject: result.subject ?? null,
                              fromEmail: result.senderEmail ?? null,
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

            <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              Searches every folder except Junk and Deleted.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
