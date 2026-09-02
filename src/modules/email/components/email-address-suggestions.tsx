import { cn } from '@/app/lib/utils';
import type { EmailContactSuggestion } from '@/modules/email/api/email.api';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';

export function EmailAddressSuggestionList({
  accountId,
  suggestions,
  activeIndex,
  onSelect,
}: {
  accountId?: string;
  suggestions: EmailContactSuggestion[];
  activeIndex: number;
  onSelect: (address: string) => void;
}) {
  return (
    <ul
      role="listbox"
      aria-label="Recipient suggestions"
      className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full min-w-64 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
    >
      {suggestions.map((suggestion, index) => (
        <li key={suggestion.address} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            tabIndex={-1}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left',
              index === activeIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
            // onMouseDown so the field's blur never fires before the pick lands.
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(suggestion.address);
            }}
          >
            <SenderAvatar
              name={suggestion.name || suggestion.address}
              email={suggestion.address}
              accountId={accountId}
              className="size-7"
            />
            <span className="min-w-0">
              {suggestion.name && (
                <span className="block truncate text-xs font-medium text-foreground">
                  {suggestion.name}
                </span>
              )}
              <span className="block truncate text-xs text-muted-foreground">
                {suggestion.address}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
