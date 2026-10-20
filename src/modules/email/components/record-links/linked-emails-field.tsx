import { useMemo, useState } from 'react';

import {
  AddButton,
  FieldPopover,
  PickerEmpty,
  PickerOption,
  PickerSearch,
} from '@/app/components/record-modal';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { type EmailMessageAcrossAccountsResult } from '@/modules/email/api/email.api';
import { useEmailMessagesAcrossAccountsQuery } from '@/modules/email/hooks';
import { usePrefetchThreadRecords } from '@/modules/email/hooks/use-thread-linked-records';
import { pickerRowsFor, pickerSearchState } from '@/modules/email/lib/picker-search';
import { emailDateLabel, type LinkedEmail } from '@/modules/email/lib/record-links';
import { useEmailReferenceLink } from '@/modules/tasks/hooks/use-email-reference-link';
import { Loader2, Mail, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * "Emails" in the task and event modals (elli-ui#1379): the mail a record is
 * about, as cards, and "Link email" to add more from any mailbox the reader
 * can open — recent mail first, a search when they type.
 */
export function LinkedEmailsField({
  value,
  onChange,
  onNavigate,
}: {
  value: LinkedEmail[];
  onChange: (next: LinkedEmail[]) => void;
  /** Called as an email is opened from its card, so the modal can close behind it. */
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const linkFor = useEmailReferenceLink();
  return (
    <div className="flex flex-col gap-1.5 py-0.5">
      {value.length > 0 ? (
        <div className="-mr-1.5 flex max-h-44 flex-col gap-1.5 overflow-y-auto overscroll-contain pr-1.5">
          {value.map((email) => (
            <div
              key={`${email.accountId}:${email.providerId}`}
              className="group grid grid-cols-[1.875rem_minmax(0,1fr)_1.75rem] items-center gap-2.5 rounded-xl border border-border/60 bg-popover py-1.5 pl-1.5 pr-1.5 transition-colors hover:border-border"
            >
              <span className="grid size-7.5 place-items-center rounded-lg bg-accent text-foreground/70">
                <Mail className="size-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                {linkFor(email) ? (
                  <Link
                    to={linkFor(email)!}
                    onClick={onNavigate}
                    title="Open this email"
                    className="block truncate text-[13.5px] font-medium text-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {email.subject?.trim() || '(No subject)'}
                  </Link>
                ) : (
                  <span className="block truncate text-[13.5px] font-medium text-foreground">
                    {email.subject?.trim() || '(No subject)'}
                  </span>
                )}
                <span className="block truncate text-xs text-muted-foreground">
                  {[email.fromName || email.fromEmail, emailDateLabel(email.receivedAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <button
                type="button"
                aria-label={`Unlink “${email.subject || 'email'}”`}
                onClick={() =>
                  onChange(
                    value.filter(
                      (item) =>
                        item.accountId !== email.accountId || item.providerId !== email.providerId
                    )
                  )
                }
                className="cursor-pointer disabled:cursor-not-allowed grid size-6.5 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <FieldPopover
        open={open}
        onOpenChange={setOpen}
        label="Link an email"
        side="top"
        className="w-[min(25rem,calc(100vw-3rem))]"
        trigger={
          <AddButton aria-haspopup="dialog">
            <Plus className="size-3.5" aria-hidden="true" />
            Link email
          </AddButton>
        }
      >
        <EmailPickerList
          linked={value}
          onPick={(email) => {
            onChange([...value, email]);
            setOpen(false);
          }}
        />
      </FieldPopover>
    </div>
  );
}

function toLinkedEmail(result: EmailMessageAcrossAccountsResult): LinkedEmail {
  return {
    accountId: result.accountId,
    providerId: result.providerId,
    conversationKey: result.conversationKey ?? null,
    threadId: result.threadId ?? null,
    subject: result.subject,
    fromEmail: result.senderEmail,
    fromName: result.senderName,
    receivedAt: result.receivedAt,
  };
}

function EmailPickerList({
  linked,
  onPick,
}: {
  linked: LinkedEmail[];
  onPick: (email: LinkedEmail) => void;
}) {
  const [term, setTerm] = useState('');
  const debounced = useDebouncedValue(term, 250);
  const query = useEmailMessagesAcrossAccountsQuery(debounced);
  const taken = useMemo(
    () => new Set(linked.map((email) => `${email.accountId}:${email.providerId}`)),
    [linked]
  );
  // Until the answer for what is typed arrives, the rows on screen are the
  // previous term's — narrowed to the ones that match, never shown as results.
  const state = pickerSearchState({
    term,
    settledTerm: debounced,
    isPlaceholderData: query.isPlaceholderData,
    isFetching: query.isFetching,
  });
  const rows = pickerRowsFor({
    rows: query.data ?? [],
    state,
    term,
    fieldsOf: (result) => [result.subject, result.senderName, result.senderEmail, result.preview],
  }).filter((result) => !taken.has(`${result.accountId}:${result.providerId}`));
  // Keyed by the threads shown, so a re-render does not ask again.
  const candidates = rows.map(toLinkedEmail);
  usePrefetchThreadRecords(candidates, rows.length > 0);
  return (
    <>
      <PickerSearch
        value={term}
        onChange={setTerm}
        placeholder="Search inbox by subject or sender…"
        label="Search emails"
      />
      <p
        className="flex items-center gap-1.5 px-2 pb-1 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80"
        aria-live="polite"
      >
        {state === 'searching' ? (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Searching…
          </>
        ) : state === 'results' ? (
          'Results'
        ) : (
          'Recent'
        )}
      </p>
      <div className="max-h-64 overflow-y-auto" role="listbox" aria-label="Emails">
        {query.isLoading ? (
          <PickerEmpty>
            <Loader2 className="mx-auto size-4 animate-spin" aria-label="Loading emails" />
          </PickerEmpty>
        ) : query.isError ? (
          <PickerEmpty>Couldn’t load emails. Try again.</PickerEmpty>
        ) : rows.length === 0 ? (
          <PickerEmpty>
            {state === 'searching' ? (
              <Loader2 className="mx-auto size-4 animate-spin" aria-label="Searching emails" />
            ) : state === 'results' ? (
              `No emails match “${term.trim()}”`
            ) : (
              'No recent emails'
            )}
          </PickerEmpty>
        ) : (
          rows.map((result) => (
            <PickerOption
              key={`${result.accountId}:${result.providerId}`}
              onClick={() => onPick(toLinkedEmail(result))}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent text-foreground/70">
                <Mail className="size-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {result.subject || '(No subject)'}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[result.senderName || result.senderEmail, emailDateLabel(result.receivedAt)]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </PickerOption>
          ))
        )}
      </div>
    </>
  );
}
