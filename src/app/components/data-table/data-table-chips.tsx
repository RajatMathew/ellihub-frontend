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
      className="flex flex-wrap items-center gap-1.5 border-b border-card-border px-4 py-2 sm:px-5"
    >
      {chips.map((chip) => (
        <Badge key={chip.id} variant="secondary" appearance="outline" size="sm">
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
