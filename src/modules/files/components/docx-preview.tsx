import { useEffect, useRef, useState, type MouseEvent } from 'react';

import { api } from '@/app/api';
import { cn } from '@/app/lib/utils';
import { PreviewZoomControl } from '@/modules/files/components/preview-zoom-control';
import { useDocumentPage } from '@/modules/files/hooks/use-document-page';
import { usePreviewZoomGestures } from '@/modules/files/hooks/use-preview-zoom-gestures';
import {
  findDocumentAnchor,
  secureDocumentLinks,
} from '@/modules/files/lib/file-preview-docx-links';
import { DEFAULT_ZOOM } from '@/modules/files/lib/preview-zoom';
import { Eye, Loader2 } from 'lucide-react';

type RenderState = 'loading' | 'ready' | 'error';

/**
 * Renders a .docx in the browser with `docx-preview`, read-only, the way Word
 * shows it: the document's own pages and styling, a status bar with the page
 * in view, and Word's zoom (− / slider / +, Ctrl/⌘ + scroll, pinch). Links are
 * checked before they can be clicked — see `secureDocumentLinks`.
 *
 * The library (and its jszip dependency) is imported on demand so it stays out
 * of the main bundle. `source` is the blob the dialog already loaded (an email
 * attachment) or the files read URL, fetched through the authenticated API
 * client.
 */
export function DocxPreview({ source }: { source: Blob | string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ source: Blob | string; state: RenderState } | null>(null);
  const state: RenderState = result?.source === source ? result.state : 'loading';
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  usePreviewZoomGestures(scrollRef, zoom, setZoom, state);
  const page = useDocumentPage(scrollRef, 'section.docx', result);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;

    (async () => {
      try {
        const [{ renderAsync }, blob] = await Promise.all([
          import('docx-preview'),
          typeof source === 'string'
            ? api.get<Blob>(source, { responseType: 'blob' }).then((res) => res.data)
            : source,
        ]);
        if (!active) return;
        container.replaceChildren();
        await renderAsync(blob, container, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreLastRenderedPageBreak: true,
        });
        // The library's stylesheet paints its wrapper gray, unlayered, so it beats our
        // utilities; that gray covered only the zoomed box, and zooming out showed the
        // dialog's color beneath it. Clear it inline; the scroller paints `bg-document-canvas`.
        container
          .querySelector<HTMLElement>('.docx-wrapper')
          ?.style.setProperty('background', 'transparent');
        // Before anything is clickable: the document's links are its author's.
        secureDocumentLinks(container);
        if (active) setResult({ source, state: 'ready' });
      } catch (error: unknown) {
        console.warn('docx preview failed', error);
        if (active) {
          container.replaceChildren();
          setResult({ source, state: 'error' });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [source]);

  /** An in-document link scrolls to its bookmark here, rather than changing the app's URL. */
  const followAnchor = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element).closest<HTMLElement>('a[data-docx-anchor]');
    const name = link?.dataset.docxAnchor;
    if (!link || !name) return;
    event.preventDefault();
    const target = containerRef.current && findDocumentAnchor(containerRef.current, name);
    target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div
        ref={scrollRef}
        // The PDF viewer's dark ground behind the pages, once there are pages to sit on it;
        // the loading and error messages keep the dialog's own background.
        className={cn(
          'relative min-h-0 flex-1 touch-pan-x touch-pan-y overflow-auto',
          state === 'ready' && 'bg-document-canvas'
        )}
      >
        {state === 'loading' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        )}
        {state === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Eye className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              This document could not be previewed. Download the file to open it.
            </p>
          </div>
        )}
        {/* Zoomed as one box, so pages, text and images scale together. */}
        <div className="w-max min-w-full" style={{ zoom: zoom / 100 }}>
          <div ref={containerRef} onClick={followAnchor} hidden={state === 'error'} />
        </div>
      </div>
      {state === 'ready' && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/70 bg-background pl-4">
          <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
            {page.total > 0 ? `Page ${page.current} of ${page.total}` : null}
          </p>
          <PreviewZoomControl zoom={zoom} onZoomChange={setZoom} />
        </div>
      )}
    </div>
  );
}
