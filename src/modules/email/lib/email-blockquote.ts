/**
 * Quoting, and — the part that was missing — un-quoting (elli-ui#929).
 *
 * `document.execCommand('formatBlock', …, 'blockquote')` only ever *applies* a
 * quote. There is no `formatBlock` value that removes one: asking for `div` or
 * `p` re-formats the paragraph *inside* the blockquote and leaves the
 * blockquote itself standing, so the quote bar never goes away. The toolbar
 * button was therefore one-way — quote something by accident and the only way
 * out was to delete the text and retype it.
 *
 * So removal is done by hand, here, against the DOM. It lives in `lib/` and
 * takes a root element rather than reading the document, which is what lets the
 * unit suite exercise it under happy-dom with no renderer.
 */

/** The `<blockquote>` the selection sits in, or null. Never escapes `root`. */
export function findBlockquote(node: Node | null | undefined, root: Node): HTMLElement | null {
  let current: Node | null = node ?? null;

  while (current && current !== root) {
    // An element check that does not depend on `instanceof HTMLElement`:
    // the node can come from another document (an iframe, a test fixture).
    if (current.nodeType === 1 && (current as Element).tagName?.toUpperCase() === 'BLOCKQUOTE') {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

/**
 * Element names that already stand on their own line. Anything else is inline
 * and needs a wrapper of its own once the blockquote around it is gone.
 */
const BLOCK_LEVEL = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIGURE',
  'FOOTER',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'UL',
]);

/** Whether the quote's content already carries its own line structure. */
function hasBlockLevelChild(blockquote: HTMLElement): boolean {
  for (const child of Array.from(blockquote.childNodes)) {
    if (child.nodeType === 1 && BLOCK_LEVEL.has((child as Element).tagName.toUpperCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Replaces a `<blockquote>` with the content it was wrapping, in place.
 *
 * The children are moved rather than re-parsed, so anything inside — a pasted
 * table, an inline image, a nested quote from the thread history — survives
 * exactly as it was. Returns the nodes that took the blockquote's place, which
 * is what the caller needs to put the caret back.
 *
 * **Inline content gets a `<div>` on the way out.** Quoting a line with
 * `formatBlock` replaces whatever block held it, so the blockquote often ends
 * up holding bare text; dropping that straight into the parent lets it run on
 * to the end of the line above — quote "oru chaaya edukkatte" under "hi",
 * unquote it, and the message reads "hioru chaaya edukkatte". Un-quoting must
 * give the text back, not reflow the message around it.
 */
export function unwrapBlockquote(blockquote: HTMLElement): Node[] {
  const parent = blockquote.parentNode;
  if (!parent) return [];

  // An empty blockquote would vanish leaving no caret position, so it leaves
  // a line break behind instead of nothing.
  if (!blockquote.firstChild) {
    const filler = blockquote.ownerDocument.createElement('br');
    parent.replaceChild(filler, blockquote);
    return [filler];
  }

  if (!hasBlockLevelChild(blockquote)) {
    const line = blockquote.ownerDocument.createElement('div');
    while (blockquote.firstChild) line.appendChild(blockquote.firstChild);
    parent.replaceChild(line, blockquote);
    return [line];
  }

  const moved: Node[] = [];
  while (blockquote.firstChild) {
    const child = blockquote.firstChild;
    blockquote.removeChild(child);
    parent.insertBefore(child, blockquote);
    moved.push(child);
  }
  parent.removeChild(blockquote);
  return moved;
}

/**
 * Whether the toolbar's quote button should read as pressed.
 *
 * `document.queryCommandState('blockquote')` is not a thing — blockquote is not
 * a command — which is why the button was declared un-togglable and never lit
 * up, leaving no way to tell quoted text from unquoted at a glance.
 */
export function isSelectionInBlockquote(selection: Selection | null, root: Node): boolean {
  if (!selection || selection.rangeCount === 0) return false;
  const anchor = selection.anchorNode;
  if (!anchor || !root.contains(anchor)) return false;
  return findBlockquote(anchor, root) !== null;
}
