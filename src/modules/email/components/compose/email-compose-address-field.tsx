import { useCallback, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { EmailAddressSuggestionList } from '@/modules/email/components/email-address-suggestions';
import { useEmailAddressSuggestions } from '@/modules/email/hooks/use-email-address-suggestions';
import {
  commitAddressChips,
  EMAIL_ADDRESS_PATTERN,
  endsWithCompleteAddress,
  parseEmailAddresses,
} from '@/modules/email/lib/email-addresses';
import { X } from 'lucide-react';

/**
 * One recipient row (To / Cc / Bcc) rendered as chips plus a typing buffer.
 * Purely presentational — every compose shell renders the same one.
 */
export function EmailComposeAddressField({
  id,
  label,
  value,
  placeholder,
  required,
  error,
  accountId,
  onChange,
  onRemove,
  dense = false,
  children,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  error?: string;
  accountId?: string;
  onChange: (value: string) => void;
  /**
   * When provided, renders an X on the right that lets the user drop the whole
   * field. Used by Cc/Bcc so the fields can be added and removed cleanly.
   */
  onRemove?: () => void;
  /**
   * Tightens the row for the inline composer, which is a card in the thread
   * rather than a full page (elli-ui#1024).
   *
   * The roomy default is right where To, Cc, Bcc and Subject stack up and want
   * their labels on a shared gutter. Inline there is one row, and at full size
   * it stood taller than the header above it and pushed the placeholder a
   * label-width to the right of a two-letter label.
   */
  dense?: boolean;
  children?: ReactNode;
}) {
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [buffer, setBuffer] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  // Keystroke-level feedback for a buffer we refused to turn into a chip. It
  // outranks the parent's send-time error because it is about what the user
  // just did; a toast would be far too loud for a keypress.
  const [bufferError, setBufferError] = useState<string | null>(null);
  const shownError = bufferError ?? error;

  // Chips are derived from the parent-owned value string — nothing about the
  // outer contract changes. `buffer` is only for text the user is typing right
  // now that hasn't been committed to a chip yet.
  const chips = useMemo(() => parseEmailAddresses(value).map((r) => r.address), [value]);

  // Suggestions only once the user starts typing — a bare focus stays quiet.
  const hasTypedQuery = buffer.trim().length > 0;
  const suggestions = useEmailAddressSuggestions(
    accountId,
    buffer,
    chips,
    focused && hasTypedQuery
  );
  const suggestionsOpen =
    focused && hasTypedQuery && !suggestionsDismissed && suggestions.length > 0;

  const selectSuggestion = useCallback(
    (address: string) => {
      setBuffer('');
      setBufferError(null);
      setActiveSuggestionIndex(-1);
      if (!chips.includes(address)) onChange([...chips, address].join(', '));
      inputRef.current?.focus();
    },
    [chips, onChange]
  );

  /**
   * Turns whatever is in the buffer into chips. Complete addresses commit;
   * anything else stays in the field with an inline error beside it, so a
   * stray word can never become a recipient and is never dropped either.
   * Returns whether the whole buffer was accepted.
   */
  const commitBuffer = useCallback(
    (text: string, pending = '') => {
      const result = commitAddressChips(chips, text, pending);
      setBuffer(result.buffer);
      setBufferError(result.error);
      if (result.chips !== chips) onChange(result.chips.join(', '));
      return result.error === null;
    },
    [chips, onChange]
  );

  const removeChip = useCallback(
    (index: number) => {
      const next = chips.filter((_, i) => i !== index);
      onChange(next.join(', '));
    },
    [chips, onChange]
  );

  const handleBufferChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setSuggestionsDismissed(false);
    setActiveSuggestionIndex(-1);
    // Pastes / typed delimiters split into chips immediately. Only the
    // complete addresses commit; the incomplete ones come back into the field
    // alongside whatever trails the last delimiter, which is still being typed
    // and so is not judged yet.
    if (/[,;\n]/.test(raw)) {
      const parts = raw.split(/[,;\n]/);
      const pending = parts.pop() ?? '';
      commitBuffer(parts.join(','), pending);
      return;
    }
    if (endsWithCompleteAddress(raw)) {
      commitBuffer(raw);
      return;
    }
    setBuffer(raw);
    // Editing is the user answering the message — retract it as they type.
    setBufferError(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Cmd/Ctrl + Enter is the send shortcut; it must reach the form untouched.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) return;
    if (suggestionsOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        // The inline composer closes on Escape; dismissing the suggestion list
        // must not also close the composer out from under the user.
        event.stopPropagation();
        setSuggestionsDismissed(true);
        setActiveSuggestionIndex(-1);
        return;
      }
      if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
        event.preventDefault();
        const active = suggestions[activeSuggestionIndex];
        if (active) selectSuggestion(active.address);
        return;
      }
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && buffer.trim()) {
      // Tab is the one key that still has somewhere to go when the buffer is
      // refused: swallowing it would trap focus in a field the user cannot
      // satisfy, so only a successful commit consumes it.
      const accepted = commitBuffer(buffer);
      if (event.key === 'Enter' || accepted) event.preventDefault();
      return;
    }
    if (event.key === 'Backspace' && buffer === '' && chips.length > 0) {
      event.preventDefault();
      removeChip(chips.length - 1);
    }
  };

  return (
    <div>
      <div className={cn('flex items-start gap-3', dense ? 'px-4 py-1.5' : 'px-5 py-2.5')}>
        <label
          htmlFor={id}
          className={cn(
            'shrink-0 text-xs font-medium text-muted-foreground',
            dense ? 'mt-[7px]' : 'mt-1.5 w-16'
          )}
        >
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
        {/*
          The whole chip strip is clickable — clicking any dead space focuses
          the inner input so the user can keep typing without hunting for the
          exact input rectangle.
        */}
        <div
          className={cn(
            'relative flex min-w-0 flex-1 flex-wrap items-center gap-1.5',
            dense ? 'min-h-7 py-0.5' : 'min-h-9 py-1',
            shownError && 'text-destructive'
          )}
          onClick={(event) => {
            if (event.target === event.currentTarget) inputRef.current?.focus();
          }}
        >
          {chips.map((address, index) => {
            // Typing can no longer produce an invalid chip, but `value` is
            // parent-owned: a server draft's recipients and a "compose to this
            // sender" prefill both land here unvalidated, so the destructive
            // state stays reachable and stays rendered.
            const isValid = EMAIL_ADDRESS_PATTERN.test(address);
            return (
              <span
                key={`${address}-${index}`}
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                  isValid
                    ? 'border border-border bg-muted/40 text-foreground'
                    : 'border border-destructive/40 bg-destructive/10 text-destructive'
                )}
              >
                <span className="min-w-0 truncate">{address}</span>
                <button
                  type="button"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${address}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeChip(index);
                    inputRef.current?.focus();
                  }}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="email"
            value={buffer}
            // Chrome ignores autocomplete="off"/"chrome-off" on fields it
            // heuristically recognizes as an address book entry, and shows
            // its own suggestion popover on top of ours (elli-ui#789). Making
            // the field readOnly until it is actually focused is what
            // reliably stops Chrome from offering to autofill it.
            autoComplete="off"
            readOnly={!focused}
            data-1p-ignore
            data-lpignore="true"
            spellCheck={false}
            placeholder={chips.length === 0 ? placeholder : undefined}
            aria-invalid={shownError ? 'true' : undefined}
            aria-describedby={shownError ? errorId : undefined}
            className="min-w-24 flex-1 border-0 bg-transparent px-0 py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
            onChange={handleBufferChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              setSuggestionsDismissed(false);
            }}
            onBlur={() => {
              setFocused(false);
              setActiveSuggestionIndex(-1);
              // Same rule as Enter: a complete address chips itself so the user
              // does not have to press anything, and an incomplete one stays
              // put with its error. Discarding it would lose typing the user
              // never agreed to lose, and committing it is the bug.
              if (buffer.trim()) commitBuffer(buffer);
            }}
          />
          {suggestionsOpen && (
            <EmailAddressSuggestionList
              accountId={accountId}
              suggestions={suggestions}
              activeIndex={activeSuggestionIndex}
              onSelect={selectSuggestion}
            />
          )}
        </div>
        {children && <div className="mt-1 flex shrink-0 items-center gap-1">{children}</div>}
        {onRemove && (
          <button
            type="button"
            className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${label} field`}
            onClick={onRemove}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {shownError && (
        <p
          id={errorId}
          className={cn('text-xs text-destructive', dense ? 'px-4 pb-1.5' : 'px-5 pb-2.5 pl-24')}
          role="alert"
        >
          {shownError}
        </p>
      )}
    </div>
  );
}
