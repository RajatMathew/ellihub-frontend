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
 * How many inline images to pull at once.
 *
 * Each one is a provider round trip — measured at 355-466ms apiece against
 * `procurement@ellicorp.com` — so fetching them one after another made a
 * six-image signature take 2.35s to finish appearing. Four at a time brings
 * that to roughly the cost of the slowest one.
 */
const INLINE_IMAGE_CONCURRENCY = 4;

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

/**
 * Deliberately takes no `AbortSignal`.
 *
 * This cache outlives whichever effect happened to ask first, so binding its
 * entries to that effect's lifetime is what broke inline images: under
 * StrictMode the first mount starts a fetch, the cleanup aborts it, the
 * `catch` below turns that into `null`, and the `null` is then cached for the
 * whole session — so the remount finds a poisoned entry and gives up. Because
 * the fetches ran in sequence, exactly one was in flight when the abort landed,
 * and it was always the first: the first inline image of every HTML message
 * rendered permanently broken. Verified by toggling StrictMode alone — 4 of 5
 * images with it on, 5 of 5 with it off.
 *
 * Letting the request finish is also the better outcome: it populates the cache
 * the remount is about to read. Callers that genuinely have navigated away stop
 * *applying* results, which is what their signal is for.
 */
async function fetchInlineImage(url: string): Promise<string | null> {
  const cached = inlineImageCache.get(url);
  if (cached) return cached;

  const request = (async () => {
    try {
      const response = await fetch(url, { credentials: 'include' });
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
  // Only a success is worth remembering. A miss cached forever is
  // indistinguishable from an image that does not exist, and the reader has no
  // way to ask again short of reloading the tab.
  void request.then((dataUrl) => {
    if (dataUrl === null && inlineImageCache.get(url) === request) {
      inlineImageCache.delete(url);
    }
  });
  return request;
}

/**
 * How many inline images the whole page has in flight at once.
 *
 * Page-wide rather than per message, and that is the point. Each of these is a
 * live call through to the mail provider, and a thread with several messages
 * open used to multiply this limit by the number of them — enough of a burst to
 * trip the provider's rate limit, at which point every image waits out a
 * retry-after and the reader watches empty boxes for a minute.
 */
const inFlightInlineImages = { count: 0 };
const inlineImageWaiters: Array<() => void> = [];

async function acquireInlineImageSlot(): Promise<void> {
  if (inFlightInlineImages.count < INLINE_IMAGE_CONCURRENCY) {
    inFlightInlineImages.count += 1;
    return;
  }
  // The slot is handed over already charged — see `releaseInlineImageSlot`.
  await new Promise<void>((resolve) => inlineImageWaiters.push(resolve));
}

/**
 * Hands the slot straight to the next waiter rather than giving it back.
 *
 * Decrementing here and letting the waiter charge itself again leaves the
 * counter below the true figure for the microtask in between — long enough for
 * the worker that just released to walk round its own loop, see room, and take
 * a slot the waiter had already been promised. Five requests in flight against
 * a cap of four, which the test below caught.
 */
function releaseInlineImageSlot(): void {
  const next = inlineImageWaiters.shift();
  if (next) {
    next();
    return;
  }
  inFlightInlineImages.count -= 1;
}

/**
 * Fetches inline images, handing each one to `onImage` as it arrives.
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
 *
 * One at a time, rather than a map returned at the end. Waiting for the whole
 * set meant the slowest image decided when the first one appeared — on a
 * rate-limited account, a signature block that stayed blank for a minute and
 * then filled in all at once. The caller now gets each image the moment it is
 * ready and puts it straight into the frame.
 */
export async function loadInlineEmailImageData(
  sources: ReadonlyMap<string, string>,
  onImage: (contentId: string, dataUrl: string) => void,
  signal?: AbortSignal
): Promise<void> {
  if (sources.size === 0) return;

  // One fetch per distinct URL — a content id and a filename often point at the
  // same attachment.
  const byUrl = new Map<string, string[]>();
  for (const [key, url] of sources) {
    byUrl.set(url, [...(byUrl.get(url) ?? []), key]);
  }

  // The budget is read and charged together *after* the await, so workers
  // cannot all pass one stale check. Bounded concurrency can overshoot by at
  // most the images already in flight, each capped at MAX_INLINED_IMAGE_BYTES.
  const entries = [...byUrl];
  let nextIndex = 0;
  let inlinedBytes = 0;

  const drain = async () => {
    while (!signal?.aborted && inlinedBytes < MAX_INLINED_TOTAL_BYTES) {
      const entry = entries[nextIndex++];
      if (!entry) return;

      const [url, keys] = entry;
      await acquireInlineImageSlot();
      let dataUrl: string | null = null;
      try {
        dataUrl = await fetchInlineImage(url);
      } finally {
        releaseInlineImageSlot();
      }
      if (!dataUrl || inlinedBytes >= MAX_INLINED_TOTAL_BYTES) continue;
      // Checked again here and not only in the loop condition: the reader may
      // have moved on during the await, and delivering into a frame that is no
      // longer on screen is work nobody asked for.
      if (signal?.aborted) return;

      inlinedBytes += dataUrl.length;
      for (const key of keys) onImage(key, dataUrl);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(INLINE_IMAGE_CONCURRENCY, entries.length) }, drain)
  );
}
