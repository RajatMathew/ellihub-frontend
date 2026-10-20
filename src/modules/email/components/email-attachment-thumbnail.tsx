import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/app/components/ui/skeleton';
import {
  createLruCache,
  createTaskLimiter,
  type AttachmentThumbnailKind,
} from '@/modules/email/lib/email-attachment-thumbnail';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import type * as PdfJs from 'pdfjs-dist';

const EmailAttachmentDocumentThumbnail = lazy(() =>
  import('@/modules/email/components/email-attachment-document-thumbnail').then((module) => ({
    default: module.EmailAttachmentDocumentThumbnail,
  }))
);

/** Starts the download a little before the card scrolls into view. */
const PREFETCH_MARGIN = '200px';
/** Wide enough for the tile on a 2x screen. */
const THUMBNAIL_WIDTH_PX = 480;

/**
 * Two downloads at a time across the whole mailbox, not per message: a thread
 * of four messages with three attachments each is still two requests in flight.
 */
const runThumbnailTask = createTaskLimiter(2);

/**
 * Drawn thumbnails, kept past the reading pane's own attachment cache — which
 * is cleared on every thread change — so going back to a thread shows its
 * thumbnails at once instead of downloading every file again. Each entry is a
 * ~30KB JPEG, not the file.
 */
const rasterCache = createLruCache<string>(48, (url) => URL.revokeObjectURL(url));
const rasterInFlight = new Map<string, Promise<string>>();

type ThumbnailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'image'; url: string }
  | { status: 'document'; blob: Blob };

let pdfjsPromise: Promise<typeof PdfJs> | null = null;

/**
 * pdf.js and its worker, loaded the first time a PDF thumbnail is drawn. The
 * worker goes through Vite's `?worker` import rather than a `?url` to the
 * package's `.mjs`: that keeps it a `.js` asset, which every server here types
 * as JavaScript — a module worker served as `application/octet-stream` does
 * not start. One port serves every document.
 */
function loadPdfjs() {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?worker'),
  ]).then(([pdfjs, { default: PdfWorker }]) => {
    pdfjs.GlobalWorkerOptions.workerPort ??= new PdfWorker();
    return pdfjs;
  });
  // A failed chunk load is not kept, so the next PDF tries again.
  pdfjsPromise.catch(() => {
    pdfjsPromise = null;
  });
  return pdfjsPromise;
}

/**
 * Draws a canvas of `width` × `height` and encodes it as a small JPEG. Kept as
 * a picture rather than the file: a 6MB photo shown 224px wide does not need
 * 6MB held for as long as the thumbnail is cached, and a PDF thumbnail must
 * not be a live viewer — an iframe brings a toolbar and scrollbars.
 */
async function toJpeg(
  width: number,
  height: number,
  draw: (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => Promise<void> | void
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  // JPEG has no alpha: a transparent PNG or a PDF page with no background
  // would otherwise encode as black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await draw(canvas, context);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode thumbnail'))),
      'image/jpeg',
      0.82
    );
  });
}

async function renderImage(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, THUMBNAIL_WIDTH_PX / bitmap.width);
    const [width, height] = [bitmap.width * scale, bitmap.height * scale];
    return await toJpeg(width, height, (_, context) =>
      context.drawImage(bitmap, 0, 0, width, height)
    );
  } finally {
    bitmap.close();
  }
}

async function renderPdfFirstPage(blob: Blob): Promise<Blob> {
  const pdfjs = await loadPdfjs();
  // XFA forms would build live inputs out of the file's own markup.
  const task = pdfjs.getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    enableXfa: false,
  });
  try {
    const page = await (await task.promise).getPage(1);
    const viewport = page.getViewport({
      scale: THUMBNAIL_WIDTH_PX / page.getViewport({ scale: 1 }).width,
    });
    return await toJpeg(viewport.width, viewport.height, async (canvas) => {
      await page.render({ canvas, viewport }).promise;
    });
  } finally {
    void task.destroy();
  }
}

function drawRaster(key: string, kind: 'image' | 'pdf', load: () => Promise<Blob>) {
  const pending = rasterInFlight.get(key);
  if (pending) return pending;

  const request = runThumbnailTask(async () => {
    const blob = await load();
    return kind === 'pdf' ? renderPdfFirstPage(blob) : renderImage(blob);
  })
    .then((jpeg) => {
      const url = URL.createObjectURL(jpeg);
      rasterCache.set(key, url);
      return url;
    })
    .finally(() => rasterInFlight.delete(key));

  rasterInFlight.set(key, request);
  return request;
}

/**
 * The thumbnail's state, fetched once the tile has been on screen — latched,
 * so one that started downloading is not abandoned when the reader scrolls on.
 *
 * Images and PDFs come back as a small picture. A Word document or a workbook
 * comes back as the file, because the only way to draw one is the preview
 * dialog's renderer, and that renders DOM, not pixels. `load` goes through the
 * reading pane's attachment cache, so opening the full preview afterwards does
 * not download the file again.
 */
function useThumbnail(cacheKey: string, kind: AttachmentThumbnailKind, load: () => Promise<Blob>) {
  const ref = useRef<HTMLButtonElement>(null);
  const [seen, setSeen] = useState(false);
  const [state, setState] = useState<ThumbnailState>(() => {
    const url = kind === 'image' || kind === 'pdf' ? rasterCache.get(cacheKey) : undefined;
    return url ? { status: 'image', url } : { status: 'loading' };
  });
  const needsLoad = state.status === 'loading';

  useEffect(() => {
    const element = ref.current;
    if (!element || seen || !needsLoad) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setSeen(true);
      },
      { rootMargin: PREFETCH_MARGIN }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [seen, needsLoad]);

  useEffect(() => {
    if (!seen || !needsLoad) return;
    let active = true;

    const request =
      kind === 'image' || kind === 'pdf'
        ? drawRaster(cacheKey, kind, load).then((url): ThumbnailState => ({ status: 'image', url }))
        : runThumbnailTask(load).then((blob): ThumbnailState => ({ status: 'document', blob }));

    request.then(
      (next) => {
        if (active) setState(next);
      },
      (error: unknown) => {
        // The tile falls back to the format icon; the file still opens and
        // downloads from its menu, which report their own failures.
        console.warn('attachment thumbnail failed', error);
        if (active) setState({ status: 'error' });
      }
    );

    return () => {
      active = false;
    };
    // `load` is rebuilt by the parent on every render; the key names the file.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, kind, seen, needsLoad]);

  // Stable, because the document renderer's effect depends on it.
  const markFailed = useCallback(() => setState({ status: 'error' }), []);

  return { ref, state, markFailed };
}

/**
 * The picture at the top of an attachment card (elli-ui#1361): the first page
 * of a PDF or Word document, the open sheet of a workbook, or the image itself.
 *
 * The box is a fixed height from the first render, so nothing below it moves
 * when the picture arrives — the skeleton, the picture and the fallback icon
 * all fill the same space.
 *
 * Clicking it opens the full preview, the same as clicking the name. It is not
 * a second tab stop: the name button below already is that control.
 */
export function EmailAttachmentThumbnail({
  cacheKey,
  kind,
  fileName,
  mimeType,
  load,
  onOpen,
}: {
  cacheKey: string;
  kind: AttachmentThumbnailKind;
  fileName: string;
  mimeType?: string | null;
  load: () => Promise<Blob>;
  onOpen: () => void;
}) {
  const { ref, state, markFailed } = useThumbnail(cacheKey, kind, load);

  return (
    <button
      ref={ref}
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      // `isolate`: the workbook grid's sticky headers carry z-indexes of their
      // own, and without a stacking context here they painted over the
      // message header above the tile.
      className="relative isolate block h-24 w-full cursor-pointer overflow-hidden border-b border-mail-line bg-sheet-canvas @md:h-32"
      onClick={onOpen}
    >
      {state.status === 'loading' && (
        <Skeleton className="size-full rounded-none motion-reduce:animate-none" />
      )}

      {state.status === 'image' && (
        <img
          src={state.url}
          alt=""
          draggable={false}
          // A photo fills the tile; a page shows from its top, as Outlook does.
          className={
            kind === 'image' ? 'size-full object-cover' : 'size-full object-cover object-top'
          }
        />
      )}

      {state.status === 'document' && (kind === 'docx' || kind === 'workbook') && (
        <Suspense fallback={<Skeleton className="size-full rounded-none" />}>
          <EmailAttachmentDocumentThumbnail kind={kind} blob={state.blob} onError={markFailed} />
        </Suspense>
      )}

      {state.status === 'error' && (
        <span className="grid size-full place-items-center bg-mail-card">
          <FileTypeIcon
            fileType="FILE"
            mimeType={mimeType}
            fileName={fileName}
            className="size-10"
          />
        </span>
      )}
    </button>
  );
}
