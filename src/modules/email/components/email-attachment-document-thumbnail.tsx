import { memo, useEffect, useRef, useState } from 'react';

import { loadSheetFonts } from '@/modules/files/components/spreadsheet-preview/sheet-fonts';
import { SheetGridView } from '@/modules/files/components/spreadsheet-preview/sheet-grid-view';
import { readWorkbook, type PreviewWorkbook } from '@/modules/files/lib/spreadsheet/workbook';

/**
 * The top of a Word document's first page or a workbook's open sheet, for the
 * attachment thumbnail (elli-ui#1361).
 *
 * Drawn by the same renderers the preview dialog uses, so the thumbnail is what
 * the full preview will show. Neither renders to pixels, so this is live DOM,
 * scaled down and made inert: no link in it can be clicked or tabbed to, and
 * no zoom gesture reaches the grid. Lazy-loaded with its renderers, so a
 * message with only PDFs and photos never fetches them.
 *
 * Memoised: ticking an attachment re-renders every card in the message, and
 * none of that reaches the picture — its props only change when the file does.
 */
export const EmailAttachmentDocumentThumbnail = memo(function EmailAttachmentDocumentThumbnail({
  kind,
  blob,
  onError,
}: {
  kind: 'docx' | 'workbook';
  blob: Blob;
  onError: () => void;
}) {
  return (
    <div inert aria-hidden="true" className="pointer-events-none size-full overflow-hidden">
      {kind === 'docx' ? (
        <DocxThumbnail blob={blob} onError={onError} />
      ) : (
        <WorkbookThumbnail blob={blob} onError={onError} />
      )}
    </div>
  );
});

function DocxThumbnail({ blob, onError }: { blob: Blob; onError: () => void }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const scale = pageWidth && frameWidth ? frameWidth / pageWidth : null;

  // The tile's width follows the reading pane (two to a row on a phone), so
  // the zoom is worked out from its live width, not the width at render time.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setFrameWidth(entry.contentRect.width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = pageRef.current;
    if (!container) return;
    let active = true;

    (async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        if (!active) return;
        container.replaceChildren();
        await renderAsync(blob, container, undefined, {
          className: 'docx',
          inWrapper: false,
          ignoreLastRenderedPageBreak: true,
          // Comments and change bars would only crowd a page this small.
          renderComments: false,
          renderChanges: false,
        });
        if (!active) return;
        // Only the first page is ever visible; the rest is layout nobody sees.
        const pages = container.querySelectorAll<HTMLElement>('section.docx');
        pages.forEach((page, index) => {
          if (index > 0) page.remove();
        });
        const width = pages[0]?.offsetWidth ?? 0;
        if (width <= 0) throw new Error('The document has no pages');
        setPageWidth(width);
      } catch (error: unknown) {
        console.warn('docx thumbnail failed', error);
        if (active) onError();
      }
    })();

    return () => {
      active = false;
    };
  }, [blob, onError]);

  return (
    <div ref={frameRef} className="size-full">
      {/* Laid out at full size, then zoomed to the tile's width — hidden until
          then, so the page never flashes at 100% over the card. */}
      <div
        ref={pageRef}
        className={scale === null ? 'invisible' : undefined}
        style={scale === null ? undefined : { zoom: scale }}
      />
    </div>
  );
}

// Stable, so `SheetTable` — memoised, and up to 1,000 rows by 50 columns — is
// not rebuilt cell by cell whenever the card above it re-renders.
const ignoreZoom = () => undefined;
const ignoreSheetLink = () => undefined;

/**
 * More than the tile shows — at 50% a 224×128 tile holds about 13 default rows
 * by 7 columns — so a sheet of narrow columns or short rows still fills it.
 */
const THUMBNAIL_ROWS = 40;
const THUMBNAIL_COLS = 20;

function WorkbookThumbnail({ blob, onError }: { blob: Blob; onError: () => void }) {
  const [workbook, setWorkbook] = useState<PreviewWorkbook | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const excelTs = await import('@/modules/files/lib/spreadsheet/excelts');
        const [next] = await Promise.all([
          readWorkbook(excelTs, await blob.arrayBuffer()),
          loadSheetFonts(),
        ]);
        if (!active) return;
        if (next.sheets.length === 0) throw new Error('The workbook has no visible sheets');
        setWorkbook(next);
      } catch (error: unknown) {
        console.warn('workbook thumbnail failed', error);
        if (active) onError();
      }
    })();
    return () => {
      active = false;
    };
  }, [blob, onError]);

  const sheet = workbook ? (workbook.sheets[workbook.activeIndex] ?? workbook.sheets[0]) : null;
  if (!workbook || !sheet) return null;

  return (
    // The grid scrolls in the dialog; here it is a picture, so its scroller
    // must not draw a scrollbar across the tile.
    <div className="size-full [&_*]:overflow-hidden">
      <SheetGridView
        sheet={sheet}
        baseFont={workbook.baseFont}
        zoom={50}
        onZoomChange={ignoreZoom}
        onOpenSheet={ignoreSheetLink}
        maxRows={THUMBNAIL_ROWS}
        maxCols={THUMBNAIL_COLS}
      />
    </div>
  );
}
