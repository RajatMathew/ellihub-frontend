import { useId, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { parseEmailAddresses, type ParsedEmailAddress } from '@/modules/email/lib/email-addresses';

import { AgentInput, AgentTextarea } from './agent-streaming-field';
import { formatRecipients } from './reply-action-rules';

type ReplyDraft = {
  subject?: string;
  to?: ParsedEmailAddress[];
  cc?: ParsedEmailAddress[];
  bcc?: ParsedEmailAddress[];
  body?: string;
};

function RecipientRow({
  label,
  value,
  placeholder,
  editable,
  onChange,
  trailing,
}: {
  label: string;
  value: ParsedEmailAddress[] | undefined;
  placeholder?: string;
  editable: boolean;
  onChange: (recipients: ParsedEmailAddress[]) => void;
  /** Controls at the end of the row, inside its underline (the Cc / Bcc links). */
  trailing?: ReactNode;
}) {
  const id = useId();
  // The box keeps what was typed; the action gets the parsed list. Parsing on
  // every keystroke and showing the result would rewrite a half-typed address.
  const formatted = formatRecipients(value);
  const [text, setText] = useState(formatted);
  const [seen, setSeen] = useState(formatted);
  // Recipients can still be streaming in after the card appears. When they
  // change from outside (not from this box), show them.
  if (formatted !== seen) {
    setSeen(formatted);
    if (formatRecipients(parseEmailAddresses(text)) !== formatted) setText(formatted);
  }
  return (
    // The address starts right after its label, as in a mail client's
    // compose window, rather than after a column sized for "Bcc" (elli-ui#1472).
    <div className="flex items-center gap-1.5 border-b border-border">
      <label htmlFor={id} className="shrink-0 text-xs text-muted-foreground">
        {label}
      </label>
      <AgentInput
        id={id}
        value={text}
        placeholder={placeholder}
        disabled={!editable}
        className="h-9 rounded-none border-transparent bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
        onChange={(event) => {
          setText(event.target.value);
          onChange(parseEmailAddresses(event.target.value));
        }}
      />
      {trailing}
    </div>
  );
}

/** Aura's email draft: a large subject, To and Cc rows, then the body. */
export function ReplyActionFields({
  draft,
  editable,
  onChange,
}: {
  draft: ReplyDraft;
  editable: boolean;
  onChange: (patch: ReplyDraft) => void;
}) {
  const bodyId = useId();
  // Collapsed until needed, like a mail client; open from the start when
  // Elliot already put someone there.
  // A recipient that streams in later still shows: nobody is copied unseen.
  const [ccOpened, setShowCc] = useState(false);
  const [bccOpened, setShowBcc] = useState(false);
  const showCc = ccOpened || !!draft.cc?.length;
  const showBcc = bccOpened || !!draft.bcc?.length;
  return (
    <div className="flex flex-col">
      <div className="-mt-2.5">
        <AgentInput
          aria-label="Subject"
          value={draft.subject ?? ''}
          disabled={!editable}
          className="h-9 rounded-none border-transparent border-b-border bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:border-transparent focus-visible:border-b-border focus-visible:ring-0"
          onChange={(event) => onChange({ subject: event.target.value })}
        />
      </div>
      <RecipientRow
        label="To"
        value={draft.to}
        placeholder="Original sender"
        editable={editable}
        onChange={(to) => onChange({ to })}
        trailing={
          editable && (!showCc || !showBcc) ? (
            <span className="flex shrink-0 items-center">
              {!showCc ? (
                <Button type="button" variant="dim" size="sm" onClick={() => setShowCc(true)}>
                  Cc
                </Button>
              ) : null}
              {!showBcc ? (
                <Button type="button" variant="dim" size="sm" onClick={() => setShowBcc(true)}>
                  Bcc
                </Button>
              ) : null}
            </span>
          ) : null
        }
      />
      {showCc ? (
        <RecipientRow
          label="Cc"
          value={draft.cc}
          editable={editable}
          onChange={(cc) => onChange({ cc })}
        />
      ) : null}
      {showBcc ? (
        <RecipientRow
          label="Bcc"
          value={draft.bcc}
          editable={editable}
          onChange={(bcc) => onChange({ bcc })}
        />
      ) : null}
      <label htmlFor={bodyId} className="sr-only">
        Reply
      </label>
      <div className="mt-3">
        <AgentTextarea
          id={bodyId}
          // Tall enough for a whole reply with its signature without scrolling.
          rows={12}
          value={draft.body ?? ''}
          disabled={!editable}
          className="min-h-64 bg-card"
          onChange={(event) => onChange({ body: event.target.value })}
        />
      </div>
    </div>
  );
}
