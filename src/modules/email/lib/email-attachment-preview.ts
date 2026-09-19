/**
 * What an attachment actually is, and whether the browser can be trusted to
 * show it (elli-ui#1047).
 *
 * The hover card previews a PDF by pointing an iframe at a `blob:` URL. A
 * browser handed bytes it cannot render inline — or a response marked as an
 * attachment — **saves the file instead**, and names it after the object URL's
 * UUID, because a `blob:` URL carries no filename. So hovering an attachment
 * downloaded it, as `a1b2c3d4-…` rather than `Invoice 1733-5721.pdf`.
 *
 * elli-core now serves previewable types as `inline`. This is the other half:
 * the client decides a type it is willing to render, re-types the blob to match
 * before building the URL, and refuses to hand an iframe anything it has not
 * confirmed. A provider that labels a PDF `application/octet-stream` — which is
 * common — cannot trigger a download here even against an unfixed server.
 *
 * Pure, so the branchy part is tested rather than discovered in a mailbox.
 */

export type AttachmentPreviewKind = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'generic';

type PreviewAttachment = {
  name: string;
  mimeType?: string | null;
};

/**
 * Extension → type, for the providers that send `application/octet-stream` and
 * leave the client to work it out. Only formats worth previewing are listed;
 * anything absent falls through to `generic` and is never rendered.
 */
const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  heic: 'image/heic',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',

  pdf: 'application/pdf',

  m4v: 'video/mp4',
  mov: 'video/quicktime',
  mp4: 'video/mp4',
  webm: 'video/webm',

  aac: 'audio/aac',
  m4a: 'audio/mp4',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',

  csv: 'text/plain',
  log: 'text/plain',
  md: 'text/plain',
  sql: 'text/plain',
  tsv: 'text/plain',
  txt: 'text/plain',
};

/**
 * Types that must never reach an iframe, whatever the extension claims.
 *
 * SVG and HTML execute script when a browser renders them, and the frame here
 * is same-origin to a `blob:` URL. `message/rfc822` is an attached email —
 * HTML in a trench coat, and nothing previews one.
 */
const NEVER_RENDER_MIME_TYPES = new Set([
  'application/xhtml+xml',
  'image/svg+xml',
  'message/rfc822',
  'text/html',
  'text/xml',
]);

/** A MIME type without its parameters: `text/plain; charset=utf-8` → `text/plain`. */
function essenceOf(mimeType: string | null | undefined): string {
  return (mimeType ?? '').trim().toLowerCase().split(';')[0]?.trim() ?? '';
}

function extensionOf(name: string): string {
  const match = name
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

/**
 * The type to treat an attachment as.
 *
 * The server's own type wins when it says something — except that
 * `application/octet-stream` says nothing, and is exactly what a provider sends
 * for the PDF this issue is about. The extension is the fallback, never an
 * override: a file the server calls `text/html` stays HTML however it is named.
 */
export function resolveAttachmentMimeType(
  attachment: PreviewAttachment,
  loadedMimeType?: string | null
): string {
  const served = essenceOf(loadedMimeType) || essenceOf(attachment.mimeType);
  if (served && served !== 'application/octet-stream') return served;

  return MIME_TYPE_BY_EXTENSION[extensionOf(attachment.name)] ?? served ?? '';
}

/** Whether this is something we are willing to put in front of the reader. */
export function canPreviewAttachmentInline(mimeType: string): boolean {
  const essence = essenceOf(mimeType);
  if (!essence || NEVER_RENDER_MIME_TYPES.has(essence)) return false;

  return (
    essence === 'application/pdf' ||
    essence === 'text/plain' ||
    essence.startsWith('image/') ||
    essence.startsWith('audio/') ||
    essence.startsWith('video/')
  );
}

/**
 * How to draw the preview. `generic` means "do not render" — the card shows the
 * placeholder rather than risking a download.
 */
export function getAttachmentPreviewKind(
  attachment: PreviewAttachment,
  loadedMimeType?: string | null
): AttachmentPreviewKind {
  const mimeType = resolveAttachmentMimeType(attachment, loadedMimeType);
  if (!canPreviewAttachmentInline(mimeType)) return 'generic';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'text/plain') return 'text';

  return 'generic';
}

/**
 * The blob to build the object URL from.
 *
 * A blob keeps the type the response gave it, so an `application/octet-stream`
 * PDF stays unrenderable no matter which element points at it — the browser
 * downloads it and the reader gets a UUID. Re-typing costs nothing (the bytes
 * are not copied) and is what makes the iframe render rather than save.
 */
export function toPreviewBlob(blob: Blob, mimeType: string): Blob {
  if (!mimeType || essenceOf(blob.type) === essenceOf(mimeType)) return blob;

  return new Blob([blob], { type: mimeType });
}
