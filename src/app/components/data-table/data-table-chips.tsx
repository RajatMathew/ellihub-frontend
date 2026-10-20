import { Badge, BadgeButton } from '@/app/components/ui/badge';
import { X } from 'lucide-react';

import type { ActiveFilterChip } from './active-filter-chips';

interface DataTableFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (keys: string[]) => void;
}

/**
 * The active-filter row, between the header and the table.
 *
 * Exists because the only signal that a list was filtered used to be the Clear
 * button becoming visible — which says *that* something is filtering, never
 * *what*. Renders nothing when no chip qualifies, so a list with only a search
 * box never grows a row.
 */
export function DataTableFilterChips({ chips, onRemove }: DataTableFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      aria-label="Active filters"
      // `bg-card` explicitly: the row sits between the header and the table, so
      // in a framed card it would otherwise show the mat through the gap and read
      // as a band of page behind the list. Same colour as the card elsewhere, so
      // this is inert when the card is not framed.
      className="flex flex-wrap items-center gap-1.5 border-b border-card-border bg-card px-4 py-2 sm:px-5"
    >
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="secondary"
          appearance="outline"
          size="sm"
          // A chip states a filter's *value* — a vendor name, a trade — which is
          // data, not a label. It opts out of the uppercase mono treatment
          // `Badge` gives a status or a type.
          className="font-sans normal-case tracking-normal"
        >
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="max-w-40 truncate font-medium">{chip.value}</span>
          <BadgeButton
            aria-label={`Remove ${chip.label} filter`}
            role="button"
            tabIndex={0}
            onClick={() => onRemove(chip.keys)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onRemove(chip.keys);
              }
            }}
          >
            <X />
          </BadgeButton>
        </Badge>
      ))}
    </div>
  );
}
