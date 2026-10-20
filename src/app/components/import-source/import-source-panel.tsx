import { useState } from 'react';

import { InfoRow } from '@/app/components/info-row';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import { formatDate } from '@/app/lib/helpers';
import type { ImportSource } from '@/app/lib/import-source';
import { cn } from '@/app/lib/utils';
import { filesApi } from '@/modules/files/api/files.api';
import { ChevronDown } from 'lucide-react';

import { ImportedFieldRows } from './imported-field-rows';

interface ImportSourcePanelProps {
  source: ImportSource;
  /** The section heading; "Source" in a record's sidebar. */
  title?: string;
}

/**
 * Where a record loaded from a legacy migration workbook came from: the file
 * (downloadable once stored), the sheet and row, the number it had there, who
 * loaded it and when - then what the import kept that ElliHub has no field
 * for, and the workbook row itself, column by column, on request.
 *
 * The same panel serves every imported record's page.
 */
/**
 * The Source section is hidden for now, on every page that shows it - imported
 * POs, change orders, invoices, RFQs, projects, contacts, vendors and GCs. The
 * pages still render it and the API still sends `importSource`; set this to
 * `true` to show it again. The "Imported" badges are not affected.
 */
export const IMPORT_SOURCE_PANEL_VISIBLE = false;

export function ImportSourcePanel({ source, title = 'Source' }: ImportSourcePanelProps) {
  const [rowOpen, setRowOpen] = useState(false);
  if (!IMPORT_SOURCE_PANEL_VISIBLE) return null;
  const workbookRow = source.workbookRow ?? [];

  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {title}
      </div>
      <Card>
        <CardContent className="space-y-1 p-4">
          {/* A vendor or GC the reference import made came from the helper export, not a sheet. */}
          <InfoRow label={source.sheet ? 'Workbook' : 'Imported from'}>
            {source.fileId ? (
              <a
                href={filesApi.getFileReadUrl(source.fileId, 'attachment')}
                className="text-primary underline-offset-2 hover:underline"
              >
                {source.fileName}
              </a>
            ) : (
              source.fileName
            )}
          </InfoRow>
          {source.sheet ? (
            <InfoRow label="Sheet">
              {source.row ? `${source.sheet}, row ${source.row}` : source.sheet}
            </InfoRow>
          ) : null}
          {source.legacyNumber ? (
            <InfoRow label="Number in workbook">{source.legacyNumber}</InfoRow>
          ) : null}
          <InfoRow label="Imported">
            {formatDate(source.importedAt)} by {source.importedBy.name}
          </InfoRow>
          <ImportedFieldRows fields={source.details} />

          {workbookRow.length ? (
            <Collapsible open={rowOpen} onOpenChange={setRowOpen} className="pt-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                  {rowOpen ? 'Hide workbook row' : 'Show workbook row'}
                  <ChevronDown
                    className={cn('size-4 transition-transform', rowOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 border-t border-border pt-2">
                <ImportedFieldRows fields={workbookRow} />
              </CollapsibleContent>
            </Collapsible>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
