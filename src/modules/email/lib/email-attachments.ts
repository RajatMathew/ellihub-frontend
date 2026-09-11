export type EmailAttachmentMetadata = {
  name: string;
  inline?: boolean;
  contentId?: string | null;
  contentUrl?: string;
};

export type EmailImageSourceMetadata = {
  src?: string | null;
  srcset?: string | null;
  originalSrc?: string | null;
  dataOriginalSrc?: string | null;
};

export function normalizeEmailContentId(value: string | null | undefined): string | null {
  if (!value) return null;

  let normalized = value.trim().replace(/^cid:/i, '').trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    // Keep the provider value when it contains a malformed percent escape.
  }

  normalized = normalized
    .replace(/^<+|>+$/g, '')
    .trim()
    .toLowerCase();
  return normalized || null;
}

export function getEmailCid(value: string | null | undefined): string | null {
  if (!value || !/^\s*cid:/i.test(value)) return null;
  return normalizeEmailContentId(value);
}

function getEmailSrcsetCid(value: string | null | undefined): string | null {
  if (!value) return null;
  const firstSource = value.split(',')[0]?.trim().split(/\s+/)[0];
  return getEmailCid(firstSource);
}

export function getEmailInlineImageCid({
  src,
  srcset,
  originalSrc,
  dataOriginalSrc,
}: EmailImageSourceMetadata): string | null {
  return (
    getEmailCid(src) ??
    getEmailSrcsetCid(srcset) ??
    getEmailCid(originalSrc) ??
    getEmailCid(dataOriginalSrc)
  );
}

export function isInlineEmailAttachment(attachment: EmailAttachmentMetadata): boolean {
  return attachment.inline === true || normalizeEmailContentId(attachment.contentId) !== null;
}

export function isReferencedInlineEmailAttachment(
  attachment: EmailAttachmentMetadata,
  body: readonly string[]
): boolean {
  if (body.length === 0 || !isInlineEmailAttachment(attachment)) return false;

  const attachmentIdentifiers = [attachment.contentId, attachment.name]
    .map(normalizeEmailContentId)
    .filter((value): value is string => Boolean(value));
  if (attachmentIdentifiers.length === 0) return false;

  for (const content of body) {
    for (const match of content.matchAll(/\bcid\s*:\s*([^"'\s)]+)/gi)) {
      const reference = normalizeEmailContentId(match[1]);
      if (reference && attachmentIdentifiers.includes(reference)) return true;
    }
  }

  return false;
}

export function getInlineEmailImageSources(
  attachments: readonly EmailAttachmentMetadata[],
  apiBaseUrl = '',
  /** When given, only these content ids are included. */
  onlyContentIds?: readonly string[]
): Map<string, string> {
  const sources = new Map<string, string>();
  const wanted = onlyContentIds ? new Set(onlyContentIds) : null;

  attachments.forEach((attachment) => {
    if (!attachment.contentUrl || !isInlineEmailAttachment(attachment)) return;

    const contentId = normalizeEmailContentId(attachment.contentId);
    const name = normalizeEmailContentId(attachment.name);
    if (wanted && !(contentId && wanted.has(contentId)) && !(name && wanted.has(name))) return;

    const contentUrl = resolveEmailAttachmentUrl(attachment.contentUrl, apiBaseUrl);
    if (contentId) sources.set(contentId, contentUrl);
    if (name && !sources.has(name)) sources.set(name, contentUrl);
  });

  return sources;
}

export function resolveEmailAttachmentUrl(contentUrl: string, apiBaseUrl: string): string {
  if (/^https?:\/\//i.test(contentUrl)) return contentUrl;

  const base = apiBaseUrl.trim().replace(/\/$/, '');
  const path = contentUrl.startsWith('/') ? contentUrl : `/${contentUrl}`;
  return `${base}${path}`;
}

export function resolveZohoInlineImageUrl(
  value: string | null | undefined,
  inlineImageBaseUrl: string | null | undefined
): string | null {
  if (!value || !inlineImageBaseUrl) return null;

  const source = value.trim().replaceAll('&amp;', '&');
  if (!source.startsWith('/')) return null;

  let parsedSource: URL;
  let parsedBase: URL;
  try {
    parsedSource = new URL(source, 'https://elli.invalid');
    parsedBase = new URL(inlineImageBaseUrl);
  } catch {
    return null;
  }

  if (!['/mail/ImageDisplay', '/zm/ImageDisplay'].includes(parsedSource.pathname)) return null;
  if (
    !/^zmdownload-accl\.(?:zoho\.(?:com|eu|in|com\.au|jp|com\.cn|ae|sa)|zohocloud\.ca)$/i.test(
      parsedBase.hostname
    )
  ) {
    return null;
  }
  if (
    !parsedSource.searchParams.get('na') ||
    !parsedSource.searchParams.get('nmsgId') ||
    !parsedSource.searchParams.get('cid')
  ) {
    return null;
  }

  const target = new URL('/zm/ImageDisplay', parsedBase);
  target.search = parsedSource.search;
  return target.toString();
}

/**
 * Caps on inlining. Both matter: a single signature logo can be a megabyte, and
 * a long thread repeats it in every quoted round.
 */
const MAX_INLINED_IMAGE_BYTES = 512 * 1024;
const MAX_INLINED_TOTAL_BYTES = 4 * 1024 * 1024;

/**
 * One in-flight fetch per URL, shared across every caller and kept for the
 * session.
 *
 * Without it the same attachment was fetched once per effect run — React's
 * development double-invoke alone doubled it — so a thread with sixteen inline
 * images pulled thirty-two requests and tens of megabytes on open, which is
 * enough to take the tab down.
 */
const inlineImageCache = new Map<string, Promise<string | null>>();

async function fetchInlineImage(url: string, signal?: AbortSignal): Promise<string | null> {
  const cached = inlineImageCache.get(url);
  if (cached) return cached;

  const request = (async () => {
    try {
      const response = await fetch(url, { credentials: 'include', signal });
      if (!response.ok) return null;

      const blob = await response.blob();
      // Oversized images are left as a URL rather than inlined: base64 adds a
      // third again on top, and the whole document is held as one string.
      if (blob.size > MAX_INLINED_IMAGE_BYTES) return null;

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } catch {
      // A missing or unreadable inline image is not worth failing a message
      // over; it renders as it would have without this step.
      return null;
    }
  })();

  inlineImageCache.set(url, request);
  return request;
}

/**
 * Fetches inline images and returns them as `data:` URIs.
 *
 * The message renders inside a sandboxed frame with no `allow-same-origin`, so
 * its document has a null origin — and a null-origin document sends no cookies.
 * Verified directly: the same image URL carries the session cookie when the
 * page requests it and carries nothing when the frame does, so every
 * authenticated attachment URL inside the frame comes back 401.
 *
 * Fetching here, in the parent, is what makes them load: the request is a
 * normal same-site one with credentials, and the bytes travel into the frame as
 * data rather than as a URL it would have to authenticate for itself.
 */
export async function loadInlineEmailImageData(
  sources: ReadonlyMap<string, string>,
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (sources.size === 0) return resolved;

  // One fetch per distinct URL — a content id and a filename often point at the
  // same attachment.
  const byUrl = new Map<string, string[]>();
  for (const [key, url] of sources) {
    byUrl.set(url, [...(byUrl.get(url) ?? []), key]);
  }

  // Sequential, so the running total is a real budget rather than sixteen
  // concurrent downloads each checking a counter none of them has updated yet.
  let inlinedBytes = 0;
  for (const [url, keys] of byUrl) {
    if (signal?.aborted || inlinedBytes >= MAX_INLINED_TOTAL_BYTES) break;

    const dataUrl = await fetchInlineImage(url, signal);
    if (!dataUrl) continue;

    inlinedBytes += dataUrl.length;
    for (const key of keys) resolved.set(key, dataUrl);
  }

  return resolved;
}
