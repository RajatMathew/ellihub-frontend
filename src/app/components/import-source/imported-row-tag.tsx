import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { describeImportSource, type ImportSource } from '@/app/lib/import-source';

/**
 * "Row 36" beside a line item, deliverable or other line that came from a
 * migration workbook row, with the file and sheet on hover. Nothing for a line
 * that was not imported, or whose row is not known.
 */
export function ImportedRowTag({ source }: { source?: ImportSource | null }) {
  if (!source?.row) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="inline-flex shrink-0 items-center rounded-sm border border-border px-1.5 text-xs font-medium text-muted-foreground"
        >
          Row {source.row}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">From {describeImportSource(source)}</TooltipContent>
    </Tooltip>
  );
}
