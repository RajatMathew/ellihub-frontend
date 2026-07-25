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
  apiBaseUrl = ''
): Map<string, string> {
  const sources = new Map<string, string>();

  attachments.forEach((attachment) => {
    if (!attachment.contentUrl || !isInlineEmailAttachment(attachment)) return;

    const contentId = normalizeEmailContentId(attachment.contentId);
    const name = normalizeEmailContentId(attachment.name);
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
