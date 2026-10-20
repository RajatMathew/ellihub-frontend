import { Badge } from '@/app/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { describeImportSource, type ImportSource } from '@/app/lib/import-source';

interface ImportedBadgeProps {
  source?: ImportSource | null;
  /**
   * Inside a link - a whole list row that opens the record - a focusable
   * tooltip would be a control nested in a control, so the badge says where
   * the record came from through its title instead.
   */
  static?: boolean;
}

/**
 * "Imported", for a record loaded from a migration workbook wherever it is
 * listed - a table row, a card, a contact - with where it came from on hover.
 * Nothing for a record that was not imported.
 */
export function ImportedBadge({ source, static: isStatic = false }: ImportedBadgeProps) {
  if (!source) return null;
  const from = `From ${describeImportSource(source)}`;

  if (isStatic) {
    return (
      <Badge variant="info" appearance="light" size="sm" title={from}>
        Imported
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="info" appearance="light" size="sm" tabIndex={0}>
          Imported
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">{from}</TooltipContent>
    </Tooltip>
  );
}
