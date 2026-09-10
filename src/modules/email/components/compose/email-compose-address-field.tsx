import { useCallback, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { EmailAddressSuggestionList } from '@/modules/email/components/email-address-suggestions';
import { useEmailAddressSuggestions } from '@/modules/email/hooks/use-email-address-suggestions';
import { EMAIL_ADDRESS_PATTERN, parseEmailAddresses } from '@/modules/email/lib/email-addresses';
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
  children?: ReactNode;
}) {
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [buffer, setBuffer] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

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
      setActiveSuggestionIndex(-1);
      if (!chips.includes(address)) onChange([...chips, address].join(', '));
      inputRef.current?.focus();
    },
    [chips, onChange]
  );

  const commitBuffer = useCallback(() => {
    const trimmed = buffer
      .trim()
      .replace(/[,;]+$/, '')
      .trim();
    setBuffer('');
    if (!trimmed) return;
    // Deduplicate — chip already present is a no-op.
    if (chips.includes(trimmed)) return;
    onChange([...chips, trimmed].join(', '));
  }, [buffer, chips, onChange]);

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
    // Pastes / typed delimiters split into chips immediately, leaving whatever
    // trails the last delimiter as the still-editable buffer.
    if (/[,;]/.test(raw)) {
      const parts = raw.split(/[,;]/).map((part) => part.trim());
      const nextBuffer = parts.pop() ?? '';
      const seen = new Set(chips);
      const additions = parts.filter((part) => {
        if (!part || seen.has(part)) return false;
        seen.add(part);
        return true;
      });
      setBuffer(nextBuffer);
      if (additions.length) {
        onChange([...chips, ...additions].join(', '));
      }
      return;
    }
    setBuffer(raw);
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
      event.preventDefault();
      commitBuffer();
      return;
    }
    if (event.key === 'Backspace' && buffer === '' && chips.length > 0) {
      event.preventDefault();
      removeChip(chips.length - 1);
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3 px-5 py-2.5">
        <label
          htmlFor={id}
          className="mt-1.5 w-16 shrink-0 text-xs font-medium text-muted-foreground"
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
            'relative flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1',
            error && 'text-destructive'
          )}
          onClick={(event) => {
            if (event.target === event.currentTarget) inputRef.current?.focus();
          }}
        >
          {chips.map((address, index) => {
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
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
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
              commitBuffer();
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
      {error && (
        <p id={errorId} className="px-5 pb-2.5 pl-24 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
