import { formatDateTime } from '@/app/lib/helpers';
import {
  EMAIL_ITEM_ATTACHMENT_MIME_TYPE,
  emailAttachmentDisplayName,
  normalizeEmailContentId,
} from '@/modules/email/lib/email-attachments';
import type { Address, Email } from 'postal-mime';

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

// --- Attached emails (elli-ui#1499) ---

/**
 * An email attached to another email, opened the way Outlook opens one
 * (elli-ui#1499): its own header, its own body, its own attachments.
 *
 * Graph serves an attached Outlook item as the message's raw MIME, so the bytes
 * are all here — they were simply handed to a dialog that saw an untyped file
 * and offered a download. Parsing happens in the browser, on bytes the reader
 * has already fetched; the body then goes through the same sanitizing renderer
 * as every other message.
 */

export type AttachedEmailPerson = { name: string; address: string };

export type AttachedEmailFile = {
  /** Position in the message — stable for one parse, and unique where names are not. */
  id: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
};

export type AttachedEmail = {
  subject: string;
  from: AttachedEmailPerson | null;
  to: AttachedEmailPerson[];
  cc: AttachedEmailPerson[];
  /** As the message states it; unparsed, since a malformed date is still worth showing. */
  date: string | null;
  html: string | null;
  text: string | null;
  attachments: AttachedEmailFile[];
};

/** How much of a file to read when deciding whether it is an email. */
const SNIFF_BYTES = 8 * 1024;

/**
 * The image types the renderer's resource policy lets through as `data:` URLs.
 * Anything else in a `cid:` reference is left alone rather than inlined only to
 * be stripped again.
 */
const INLINABLE_IMAGE_TYPES = new Set([
  'image/avif',
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

/** Past this an inline image stays out of the body: it is base64 inside one HTML string. */
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

const HEADER_LINE = /^[!-9;-~]+:/;
const IDENTIFYING_HEADERS = ['subject', 'date', 'message-id', 'mime-version'];

/**
 * Whether a file of unstated type is worth sniffing at all.
 *
 * Only a type that says nothing is second-guessed. Elli has stored every
 * Outlook item already synced with no type (`EmailAttachmentCache.mimeType` is
 * null for them), and the download serves that as `application/octet-stream` —
 * so the bytes are the only place left that knows.
 */
export function shouldSniffForEmail(mimeType: string | null | undefined): boolean {
  const essence = (mimeType ?? '').trim().toLowerCase().split(';')[0]?.trim() ?? '';
  return essence === '' || essence === 'application/octet-stream';
}

/**
 * Whether the start of a file reads as an RFC 5322 message: a block of header
 * fields up to the first blank line, with a `From:` and at least one other
 * field only a message carries. A PDF, a zip or a text note fails on its first
 * line.
 */
export function looksLikeEmailMessage(head: string): boolean {
  const headerBlock = head.replace(/^\uFEFF/, '').split(/\r?\n\r?\n/, 1)[0] ?? '';
  const lines = headerBlock.split(/\r?\n/);
  if (lines.length < 2) return false;

  const names = new Set<string>();
  for (const line of lines) {
    // A folded header continues on an indented line.
    if (/^[ \t]/.test(line)) continue;
    if (!HEADER_LINE.test(line)) return false;
    names.add(line.slice(0, line.indexOf(':')).toLowerCase());
  }

  return names.has('from') && IDENTIFYING_HEADERS.some((name) => names.has(name));
}

export async function sniffEmailMessage(blob: Blob): Promise<boolean> {
  return looksLikeEmailMessage(await blob.slice(0, SNIFF_BYTES).text());
}

/**
 * Points every `cid:` reference the message can satisfy at its image's data.
 *
 * The images ride inside the attached message itself, so there is no
 * attachment URL to fetch them from — this is the only way they appear.
 */
export function inlineContentIdImages(html: string, images: ReadonlyMap<string, string>): string {
  if (images.size === 0) return html;

  return html.replace(/\bcid:([^"'\s)>]+)/gi, (reference, contentId: string) => {
    const key = normalizeEmailContentId(contentId);
    return (key && images.get(key)) || reference;
  });
}

function contentIdsReferenced(html: string): Set<string> {
  const referenced = new Set<string>();
  for (const match of html.matchAll(/\bcid:([^"'\s)>]+)/gi)) {
    const key = normalizeEmailContentId(match[1]);
    if (key) referenced.add(key);
  }
  return referenced;
}

function toPerson(name: string, address: string | undefined): AttachedEmailPerson {
  // A long Cc line is folded across lines, and the fold's tab survives into
  // the name: "Steven\tBonilla".
  return { name: name.replace(/\s+/g, ' ').trim(), address: address?.trim() ?? '' };
}

function toPeople(addresses: readonly Address[] | undefined): AttachedEmailPerson[] {
  return (addresses ?? []).flatMap((entry) =>
    entry.group
      ? entry.group.map(({ name, address }) => toPerson(name, address))
      : [toPerson(entry.name, entry.address)]
  );
}

function toBytes(content: ArrayBuffer | Uint8Array | string): Uint8Array<ArrayBuffer> {
  if (typeof content === 'string') return new TextEncoder().encode(content);
  // A fresh copy: a view into postal-mime's own buffer can be a slice of a
  // larger one, and a Blob built from the whole buffer would carry the rest.
  return new Uint8Array(content instanceof Uint8Array ? content : new Uint8Array(content));
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

/**
 * Turns postal-mime's parse into what the preview draws. Split from the parse
 * itself so the decisions — which parts are files, which are the body's images
 * — are tested without a MIME fixture.
 */
export function toAttachedEmail(email: Email): AttachedEmail {
  const html = email.html?.trim() ? email.html : null;
  const referenced = html ? contentIdsReferenced(html) : new Set<string>();
  const images = new Map<string, string>();
  const attachments: AttachedEmailFile[] = [];

  email.attachments.forEach((part, index) => {
    const bytes = toBytes(part.content);
    const mimeType = part.mimeType.toLowerCase();
    const contentId = normalizeEmailContentId(part.contentId);

    // An image the body draws is part of the body, as Outlook treats it — the
    // five signature logos in the message that prompted this stay out of the
    // list of eight drawings.
    if (contentId && referenced.has(contentId)) {
      if (INLINABLE_IMAGE_TYPES.has(mimeType) && bytes.length <= MAX_INLINE_IMAGE_BYTES) {
        images.set(contentId, `data:${mimeType};base64,${toBase64(bytes)}`);
      }
      return;
    }

    attachments.push({
      id: String(index),
      name:
        part.filename?.trim() ||
        (mimeType === EMAIL_ITEM_ATTACHMENT_MIME_TYPE ? 'Attached message' : 'Attachment'),
      mimeType,
      size: bytes.length,
      blob: new Blob([bytes], { type: mimeType }),
    });
  });

  return {
    subject: email.subject?.trim() ?? '',
    from: toPeople(email.from ? [email.from] : undefined)[0] ?? null,
    to: toPeople(email.to),
    cc: toPeople(email.cc),
    date: email.date ?? null,
    html: html ? inlineContentIdImages(html, images) : null,
    text: email.text?.trim() ? email.text : null,
    attachments,
  };
}

export async function parseAttachedEmail(blob: Blob): Promise<AttachedEmail> {
  // On demand: only someone opening an attached email pays for the parser.
  const { default: PostalMime } = await import('postal-mime');
  // `rfc822Attachments` keeps an email attached *to this one* as a file to
  // open in turn. Without it postal-mime splices that message's body into this
  // one's, and the reader sees two letters run together.
  const email = await PostalMime.parse(blob, {
    rfc822Attachments: true,
    attachmentEncoding: 'arraybuffer',
  });
  return toAttachedEmail(email);
}

/** The name a person goes by in the header, falling back to their address. */
export function attachedEmailPersonLabel(person: AttachedEmailPerson): string {
  return person.name.trim() || person.address;
}

/** When it was sent, in the reader's time — or the header as written when it will not parse. */
export function formatAttachedEmailDate(date: string | null): string | null {
  if (!date) return null;
  return Number.isNaN(new Date(date).getTime()) ? date : formatDateTime(date);
}

/** One of its files, as the preview dialog takes it — opened in a dialog of its own. */
export function attachedEmailFilePreviewItem(file: AttachedEmailFile) {
  return {
    id: file.id,
    name: file.name,
    displayName: emailAttachmentDisplayName(file),
    mimeType: file.mimeType,
    size: file.size,
    type: 'FILE' as const,
  };
}
