import { useRef, useState } from 'react';

import { cn } from '@/app/lib/utils';
import { Loader2, Search, X } from 'lucide-react';

/**
 * The search box of the mailbox's Tasks and Calendar tabs (elli-ui#1380),
 * drawn like the mail list's own so the three tabs read as one workspace:
 * a tint at rest, lifted onto the card surface while focused or filled.
 * Escape clears it.
 */
export function WorkspaceSearch({
  id,
  value,
  onChange,
  label,
  placeholder = 'Search',
  busy = false,
  autoFocus = false,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Read by screen readers; the placeholder is not a label. */
  label: string;
  placeholder?: string;
  /** A slower, wider search is still running behind the instant one. */
  busy?: boolean;
  /** Focus on mount — for a box that opens from an icon. */
  autoFocus?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          'flex h-9 items-center gap-1.5 rounded-[10px] border border-mail-line pe-2 ps-3 motion-safe:transition-colors motion-safe:duration-100',
          focused || value ? 'bg-mail-card' : 'bg-mail-search'
        )}
      >
        <Search
          aria-hidden="true"
          className="size-[15px] shrink-0 text-mail-mid"
          strokeWidth={1.8}
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          spellCheck={false}
          className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-mail-ink outline-hidden placeholder:text-mail-mid"
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && value) {
              // Clear first; a second Escape reaches whatever is underneath.
              event.preventDefault();
              event.stopPropagation();
              onChange('');
            }
          }}
        />
        {busy ? (
          <Loader2
            aria-label="Searching"
            className="size-3.5 shrink-0 animate-spin text-mail-mid"
          />
        ) : null}
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            className="flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-mail-search-clear/60 text-mail-mid hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
            // Keeps focus in the field: clearing unmounts this button.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden="true" className="size-[11px]" strokeWidth={2.2} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
