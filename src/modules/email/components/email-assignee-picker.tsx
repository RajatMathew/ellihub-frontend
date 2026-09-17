import { useState } from 'react';

import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/app/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { getOutlookAvatarStyle, getOutlookInitials } from '@/app/lib/outlook-avatar';
import { cn } from '@/app/lib/utils';
import type { EmailThreadAssigneeInfo } from '@/modules/email/components/email-reference-marker-storage';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { useEmailThreadAssigneesQuery } from '@/modules/email/hooks';
import { Check, ChevronDown, Loader2, UserPlus, UserX } from 'lucide-react';

export function EmailAssigneeAvatar({
  assignee,
  accountId,
  className,
}: {
  assignee: EmailThreadAssigneeInfo;
  accountId?: string;
  className?: string;
}) {
  const initials = getOutlookInitials(assignee.name);

  if (assignee.image) {
    return (
      <img
        src={assignee.image}
        alt={assignee.name}
        title={assignee.name}
        className={cn('size-5 shrink-0 rounded-full border border-border object-cover', className)}
      />
    );
  }
  // No stored picture — try the provider photo for their address (org
  // accounts return real photos; everyone else falls back to initials).
  if (accountId && assignee.email) {
    return (
      <span title={assignee.name} className="contents">
        <SenderAvatar
          name={assignee.name}
          email={assignee.email}
          accountId={accountId}
          className={cn('size-5 text-[9px]', className)}
        />
      </span>
    );
  }
  return (
    <span
      title={assignee.name}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold uppercase',
        className
      )}
      // Exact Outlook avatar colours — see outlook-avatar.ts.
      style={getOutlookAvatarStyle(assignee.name)}
    >
      {initials || '?'}
    </span>
  );
}

export function EmailAssigneePicker({
  assignee,
  accountId,
  disabled = false,
  onChange,
}: {
  assignee: EmailThreadAssigneeInfo | null;
  accountId?: string;
  disabled?: boolean;
  onChange: (assignee: EmailThreadAssigneeInfo | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const assigneesQuery = useEmailThreadAssigneesQuery(open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[12px] font-medium',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
                'motion-safe:transition-colors motion-safe:duration-100',
                // The open trigger takes a dark edge so it reads as the thing
                // the list below belongs to, rather than floating loose.
                open
                  ? 'border-mail-ink bg-mail-card text-mail-ink'
                  : 'border-mail-pane-line bg-mail-card text-mail-mid hover:border-mail-row-edge hover:text-mail-ink'
              )}
              aria-label={assignee ? `Assigned to ${assignee.name}` : 'Assign this email'}
              disabled={disabled}
            >
              {assignee ? (
                <>
                  <EmailAssigneeAvatar
                    accountId={accountId}
                    assignee={assignee}
                    className="size-4 text-[8px]"
                  />
                  <span className="max-w-28 truncate">{assignee.name.split(' ')[0]}</span>
                  <ChevronDown aria-hidden="true" className="size-3 shrink-0 text-mail-muted" />
                </>
              ) : (
                <>
                  <UserPlus aria-hidden="true" className="size-3" />
                  Assign
                </>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent variant="light" side="bottom">
          {assignee ? `Assigned to ${assignee.name}` : 'Assign this email to a teammate'}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-72 rounded-xl border-mail-line p-1"
      >
        <Command>
          <CommandInput placeholder="Search teammates" />
          <CommandList className="max-h-64">
            {assigneesQuery.isLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
                Loading teammates…
              </div>
            )}
            {assigneesQuery.isError && (
              <div className="px-2 py-4 text-center text-xs text-destructive">
                Couldn’t load teammates. Close and try again.
              </div>
            )}
            {!assigneesQuery.isLoading && !assigneesQuery.isError && (
              <CommandEmpty>No teammates found.</CommandEmpty>
            )}
            {assignee && (
              <CommandItem
                value="__unassign"
                className="min-h-8 gap-2 text-xs text-muted-foreground"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <UserX aria-hidden="true" className="size-4" />
                Unassign
              </CommandItem>
            )}
            {/* A face and a name. The address underneath doubled every row's
                height for something nobody picks a colleague by — it is still
                what the search matches on. */}
            {(assigneesQuery.data ?? []).map((user) => (
              <CommandItem
                key={user.id}
                value={`${user.name} ${user.email}`}
                className="min-h-11 gap-3 rounded-lg px-2.5"
                onSelect={() => {
                  // Picking the current assignee again toggles them off.
                  onChange(assignee?.id === user.id ? null : user);
                  setOpen(false);
                }}
              >
                <EmailAssigneeAvatar
                  accountId={accountId}
                  assignee={user}
                  className="size-8 text-[11px]"
                />
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-mail-ink">
                  {user.name}
                </span>
                {assignee?.id === user.id && (
                  <Check aria-hidden="true" className="size-4 shrink-0 text-mail-ink" />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
