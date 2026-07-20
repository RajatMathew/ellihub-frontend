export type EmailAttachmentMetadata = {
  name: string;
  inline?: boolean;
  contentId?: string | null;
  contentUrl?: string;
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

export function isInlineEmailAttachment(attachment: EmailAttachmentMetadata): boolean {
  return attachment.inline === true || normalizeEmailContentId(attachment.contentId) !== null;
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
