import { linkTarget, safeHref } from './file-preview-links';

/**
 * Makes the hyperlinks `docx-preview` rendered safe to click.
 *
 * The library copies a document's links into the page as written, so a
 * `.docx` from an email could carry `href="javascript:…"` and run its script
 * in the app the moment someone clicks it. It also gives web links no
 * `target`, so following one navigated the whole app away.
 *
 * - Web, email and phone links keep their `href` (normalized), and web links
 *   open in a new tab without a referrer.
 * - An in-document link (`#appendix`) is marked with `data-docx-anchor`, for
 *   the preview to scroll to its bookmark rather than change the app's URL.
 * - Anything else loses its `href` and reads as plain text.
 */
export function secureDocumentLinks(root: ParentNode): void {
  for (const link of Array.from(root.querySelectorAll('a'))) {
    const raw = link.getAttribute('href');
    link.removeAttribute('target');
    link.removeAttribute('rel');
    if (raw == null) continue;
    if (raw.startsWith('#') && raw.length > 1) {
      link.dataset.docxAnchor = decodeURIComponent(raw.slice(1));
      continue;
    }
    const href = safeHref(raw);
    if (!href) {
      link.removeAttribute('href');
      continue;
    }
    link.setAttribute('href', href);
    const { target, rel } = linkTarget(href);
    if (target) link.setAttribute('target', target);
    if (rel) link.setAttribute('rel', rel);
  }
}

/** The element an in-document link points at: a bookmark's `id`, or a legacy `name` anchor. */
export function findDocumentAnchor(root: ParentNode, name: string): Element | null {
  for (const el of Array.from(root.querySelectorAll('[id], a[name]'))) {
    if (el.id === name || el.getAttribute('name') === name) return el;
  }
  return null;
}
