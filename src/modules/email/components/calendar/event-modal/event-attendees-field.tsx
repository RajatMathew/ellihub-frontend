import { useMemo, useState } from 'react';

import {
  AddButton,
  FieldPopover,
  PickerEmpty,
  PickerOption,
  PickerSearch,
} from '@/app/components/record-modal';
import { useEmailAddressSuggestions } from '@/modules/email/hooks/use-email-address-suggestions';
import {
  EMAIL_ADDRESS_PATTERN,
  formatEmailAddress,
  parseEmailAddresses,
} from '@/modules/email/lib/email-addresses';
import { TaskAssigneeAvatar } from '@/modules/tasks/components/task-assignee-avatar';
import { Plus, X } from 'lucide-react';

/**
 * "Attendees" in the event modal (elli-ui#1379): who is invited, as pills, and
 * "Invite attendees" to add people the mailbox has written to or any email
 * address typed in full. Each one gets the provider's invitation when the
 * event is saved — this field sends nothing itself.
 *
 * The value stays the comma-separated list the dialog already validates and
 * compares, so what counts as a change to the guest list is unchanged.
 */
export function EventAttendeesField({
  accountId,
  value,
  onChange,
}: {
  accountId?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const people = useMemo(() => parseEmailAddresses(value), [value]);
  const addresses = useMemo(() => people.map((person) => person.address.toLowerCase()), [people]);
  const typed = query.trim();
  const suggestions = useEmailAddressSuggestions(
    accountId,
    typed,
    addresses,
    open && typed.length > 0
  );
  const canInvite = EMAIL_ADDRESS_PATTERN.test(typed) && !addresses.includes(typed.toLowerCase());

  const add = (person: { address: string; name?: string | null }) => {
    if (addresses.includes(person.address.toLowerCase())) return;
    onChange(
      [...people, { address: person.address, name: person.name ?? undefined }]
        .map(formatEmailAddress)
        .join(', ')
    );
    setQuery('');
  };
  const remove = (address: string) =>
    onChange(
      people
        .filter((person) => person.address !== address)
        .map(formatEmailAddress)
        .join(', ')
    );

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-0.5">
      {people.map((person) => (
        <span
          key={person.address}
          title={person.name ? person.address : undefined}
          className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-popover pl-0.5 pr-0.5 text-[13px]"
        >
          <TaskAssigneeAvatar name={person.name || person.address} size="sm" />
          <span className="truncate">{person.name || person.address}</span>
          <button
            type="button"
            aria-label={`Remove ${person.name || person.address}`}
            onClick={() => remove(person.address)}
            className="cursor-pointer disabled:cursor-not-allowed grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </span>
      ))}
      <FieldPopover
        open={open}
        onOpenChange={setOpen}
        label="Invite attendees"
        trigger={
          <AddButton aria-haspopup="dialog">
            <Plus className="size-3.5" aria-hidden="true" />
            Invite attendees
          </AddButton>
        }
      >
        <div
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canInvite) {
              event.preventDefault();
              add({ address: typed });
            }
          }}
        >
          <PickerSearch
            value={query}
            onChange={setQuery}
            placeholder="Name or email address"
            label="Search people or type an email"
          />
        </div>
        <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="People">
          {canInvite ? (
            <PickerOption onClick={() => add({ address: typed })}>
              <TaskAssigneeAvatar name={typed} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                Invite <span className="font-medium">{typed}</span>
              </span>
            </PickerOption>
          ) : null}
          {suggestions.map((suggestion) => (
            <PickerOption key={suggestion.address} onClick={() => add(suggestion)}>
              <TaskAssigneeAvatar name={suggestion.name || suggestion.address} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{suggestion.name || suggestion.address}</span>
                {suggestion.name ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.address}
                  </span>
                ) : null}
              </span>
            </PickerOption>
          ))}
          {!canInvite && suggestions.length === 0 ? (
            <PickerEmpty>
              {typed
                ? 'Type a full email address to invite someone new'
                : 'Search people you’ve emailed'}
            </PickerEmpty>
          ) : null}
        </div>
      </FieldPopover>
    </div>
  );
}
