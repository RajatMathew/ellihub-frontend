import { useEffect, useState } from 'react';

import { api } from '@/app/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { PreviewZoomControl } from '@/modules/files/components/preview-zoom-control';
import { DEFAULT_ZOOM } from '@/modules/files/lib/preview-zoom';
import {
  readWorkbook,
  type PreviewWorkbook,
  type WorkbookSheet,
} from '@/modules/files/lib/spreadsheet/workbook';
import { Eye, Loader2 } from 'lucide-react';

import { loadSheetFonts } from './sheet-fonts';
import { SheetGridView } from './sheet-grid-view';

type LoadResult =
  | { source: Blob | string; workbook: PreviewWorkbook }
  | { source: Blob | string; failed: true };

/**
 * Previews an Excel workbook, read-only. The dialog lazy-loads this component,
 * and ExcelTS loads on demand inside it, so neither is in the main bundle.
 *
 * `source` is the blob the dialog already loaded (an email attachment) or the
 * files read URL, fetched through the authenticated API client — the same
 * contract as `DocxPreview`.
 */
export function WorkbookPreview({ source }: { source: Blob | string }) {
  const [result, setResult] = useState<LoadResult | null>(null);
  const current = result?.source === source ? result : null;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [excelTs, blob] = await Promise.all([
          import('@/modules/files/lib/spreadsheet/excelts'),
          typeof source === 'string'
            ? api.get<Blob>(source, { responseType: 'blob' }).then((res) => res.data)
            : source,
        ]);
        // Fonts first: column widths and `###` checks measure the font the grid draws in.
        const [workbook] = await Promise.all([
          readWorkbook(excelTs, await blob.arrayBuffer()),
          loadSheetFonts(),
        ]);
        if (!active) return;
        setResult({ source, workbook });
      } catch (error: unknown) {
        console.warn('spreadsheet preview failed', error);
        if (active) setResult({ source, failed: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [source]);

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  if ('failed' in current || current.workbook.sheets.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <Eye className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {'failed' in current
            ? 'This spreadsheet could not be previewed. Download the file to open it.'
            : 'This spreadsheet has no visible sheets.'}
        </p>
      </div>
    );
  }

  return <WorkbookSheets workbook={current.workbook} />;
}

function WorkbookSheets({ workbook }: { workbook: PreviewWorkbook }) {
  const { sheets, baseFont } = workbook;
  // Sheet names are unique within a workbook, so they double as tab values.
  const [active, setActive] = useState(sheets[workbook.activeIndex]?.name ?? sheets[0]!.name);
  // Zoom is per sheet, as in Excel. Every sheet opens at 100%, whatever zoom it was saved at.
  const [zooms, setZooms] = useState<Record<string, number>>({});
  const zoomOf = (sheet: WorkbookSheet) => zooms[sheet.name] ?? DEFAULT_ZOOM;
  const activeSheet = sheets.find((sheet) => sheet.name === active) ?? sheets[0]!;
  const updateZoom = (sheet: WorkbookSheet, update: (zoom: number) => number) =>
    setZooms((current) => ({
      ...current,
      [sheet.name]: update(current[sheet.name] ?? DEFAULT_ZOOM),
    }));

  return (
    <Tabs value={active} onValueChange={setActive} className="flex h-full min-h-0 flex-col gap-0">
      {sheets.map((sheet) => (
        <TabsContent key={sheet.name} value={sheet.name} className="mt-0 min-h-0 flex-1">
          <SheetGridView
            sheet={sheet}
            baseFont={baseFont}
            zoom={zoomOf(sheet)}
            onZoomChange={(update) => updateZoom(sheet, update)}
            onOpenSheet={setActive}
          />
        </TabsContent>
      ))}
      <div className="flex shrink-0 items-center gap-2 border-t border-border/70 bg-background">
        <TabsList
          variant="button"
          size="xs"
          aria-label="Sheets"
          className="min-w-0 flex-1 justify-start gap-0.5 overflow-x-auto bg-transparent px-2 py-1"
        >
          {sheets.map((sheet) => (
            <TabsTrigger
              key={sheet.name}
              value={sheet.name}
              className="relative max-w-48 rounded-sm px-3 py-1.5 text-xs text-muted-foreground data-[state=active]:bg-card data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <span className="truncate">{sheet.name}</span>
              {sheet.tabColor && (
                // The tab color the workbook's author set — file data, not a theme value.
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0.5 h-0.5 rounded-sm"
                  style={{ backgroundColor: sheet.tabColor }}
                />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <PreviewZoomControl
          zoom={zoomOf(activeSheet)}
          onZoomChange={(zoom) => updateZoom(activeSheet, () => zoom)}
        />
      </div>
    </Tabs>
  );
}
