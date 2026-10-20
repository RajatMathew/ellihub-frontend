/**
 * Links inside previewed files — a spreadsheet's cell links and text boxes, a
 * Word document's hyperlinks. The files come from anyone (an email
 * attachment), so a link is only made clickable when its scheme is one a
 * person would expect to follow: the web, email, and phone. `javascript:`,
 * `data:`, `file:` and the rest stay plain text.
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

/** The link as a safe `href`, or `undefined` when it should not be clickable. */
export function safeHref(target: string | null | undefined): string | undefined {
  const value = target?.trim();
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : undefined;
  } catch {
    // A bare domain ("www.example.com") is how Excel often stores a typed link.
    if (/^www\.[^\s/]+\.[^\s]+$/i.test(value)) return safeHref(`https://${value}`);
    return undefined;
  }
}

/**
 * Web links open in a new tab, so the preview stays open, and send no referrer.
 * `mailto:` and `tel:` hand off to the mail or phone app instead: a new tab for
 * them is left behind blank.
 */
export function linkTarget(href: string): { target?: '_blank'; rel?: string } {
  return /^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/**
 * The sheet a workbook-internal link points at: `#'Bid Form'!A1`, `#Sheet2!B4`
 * or `Sheet2!B4` (Excel writes both). `undefined` for anything else.
 */
export function internalSheetTarget(target: string | null | undefined): string | undefined {
  const value = target?.trim().replace(/^#/, '');
  if (!value) return undefined;
  const quoted = /^'((?:[^']|'')+)'!/.exec(value);
  if (quoted) return quoted[1]!.replace(/''/g, "'");
  const plain = /^([^!'"\s:/][^!:/]*)!\$?[A-Z]{1,3}\$?\d+/i.exec(value);
  return plain ? plain[1] : undefined;
}
