/**
 * Quoted-content detection for rendered email bodies.
 *
 * Every reply a provider composes carries the whole conversation below it, so
 * a two-line answer renders as a wall of history (elli-ui#788). Mail clients
 * solve this by hiding the quoted run behind a "···" toggle; this module finds
 * that run so `EmailMessageBody` can wrap it.
 *
 * There is no standard for marking a quote, so detection is layered the way
 * Mailspring's `QuotedHTMLTransformer` and quotequail do it — one detector per
 * client convention, plus generic markers — and then filtered by the rule that
 * matters more than any single detector: **only a quote with nothing unquoted
 * after it is collapsible.** That is what keeps an inline reply (answers typed
 * between quoted paragraphs, common in construction email threads) fully
 * visible instead of being swallowed by the toggle.
 *
 * The result is marked, never removed: the user can always read the history.
 */

export const QUOTED_CONTENT_ATTRIBUTE = 'data-elli-quoted-content';
export const QUOTE_TOGGLE_ATTRIBUTE = 'data-elli-quote-toggle';

/**
 * Wrappers each client puts around a quote. Substring matching on `class` is
 * deliberate: Outlook rewrites foreign class names with an `x_` prefix
 * (`x_gmail_quote`), and Gmail has shipped both `gmail_quote` and
 * `gmail_quote_container`.
 */
const QUOTE_CONTAINER_SELECTORS = [
  '[class*="gmail_quote"]', // Gmail (div + blockquote, old and new markup)
  '[class*="yahoo_quoted"]', // Yahoo and AOL
  '[class*="moz-cite-prefix"]', // Thunderbird attribution line
  '[class*="protonmail_quote"]', // Proton Mail
  '[class*="zmail_extra"]', // Zoho Mail
  '[id^="OLK_SRC_BODY_SECTION"]', // Outlook for Mac
  'blockquote',
].join(', ');

/**
 * Markers that do not wrap the quote — everything *after* them is quoted.
 * `#divRplyFwdMsg` is the header block Outlook and Microsoft Graph emit on
 * reply/forward; the original body follows it as a plain sibling.
 */
const QUOTE_MARKER_SELECTORS = ['#divRplyFwdMsg', '#OLK_SRC_BODY_SECTION'].join(', ');

/** Separator lines clients write instead of a container. */
const QUOTE_MARKER_TEXT_PATTERNS = [
  /^-{2,}\s*original message\s*-{2,}$/i,
  /^-{2,}\s*forwarded message\s*-{2,}$/i,
  /^-{2,}\s*ursprüngliche nachricht\s*-{2,}$/i,
  /^-{2,}\s*mensaje original\s*-{2,}$/i,
  /^-{2,}\s*message transféré\s*-{2,}$/i,
  /^begin forwarded message:?$/i,
  /^_{10,}$/,
];

/**
 * Outlook's divider above a quoted original: a border-top rule with no
 * container of its own. Both the `#B5C4DF` and `#E1E1E1` colours and the inch
 * and centimetre paddings show up in the wild, so match the shape, not values.
 */
const OUTLOOK_DIVIDER_STYLE_PATTERN = /border-top:\s*solid\s*#[0-9a-f]{3,6}\s*1\.0pt/i;

/** `From:`/`Sent:`/`To:`/`Subject:` header blocks, in the languages we see. */
const QUOTE_HEADER_LABELS = new Set(
  [
    'from',
    'sent',
    'date',
    'to',
    'cc',
    'subject',
    'von',
    'gesendet',
    'an',
    'betreff',
    'de',
    'enviado',
    'para',
    'asunto',
    'à',
    'objet',
  ].map((label) => label.toLowerCase())
);

/**
 * Attribution lines ("On <date>, <sender> wrote:"). Used to pull the sentence
 * introducing a quote into the collapsed run — without it the toggle hides the
 * history but leaves a dangling "On Thursday, Rajat wrote:" behind.
 */
const ATTRIBUTION_PATTERNS = [
  /\bon\b[\s\S]{0,400}\bwrote:\s*$/i,
  /\bam\b[\s\S]{0,400}\bschrieb\b[\s\S]{0,400}:\s*$/i,
  /\ble\b[\s\S]{0,400}\ba écrit\s*:\s*$/i,
  /\bel\b[\s\S]{0,400}escribió:\s*$/i,
  /\bop\b[\s\S]{0,400}\b(schreef|heeft)\b[\s\S]{0,400}:\s*$/i,
  /\bden\b[\s\S]{0,400}skrev\b[\s\S]{0,400}:\s*$/i,
  /\bem\b[\s\S]{0,400}escreveu:\s*$/i,
  /написал\(а\):\s*$/i,
];

/** A word from an attribution line, used to decide whether to keep scanning. */
const ATTRIBUTION_HINT_PATTERN =
  /wrote:|schrieb|écrit|escribió|schreef|geschreven|skrev|escreveu|написал/i;

/** Attribution wrappers a client labelled for us. */
const ATTRIBUTION_SELECTORS = [
  '[class*="gmail_attr"]',
  '[class*="moz-cite-prefix"]',
  '[class*="protonmail_quote"]',
].join(', ');

/**
 * Signature blocks. Some clients append the sender's signature *below* the
 * quote, and treating that as ordinary content would keep every such message
 * expanded. They are transparent to the "is anything unquoted after this?"
 * test, but deliberately never candidates themselves — a signature sitting
 * above the quote, which is the usual placement, must stay visible.
 */
const SIGNATURE_SELECTORS = [
  '[class*="gmail_signature"]',
  '[class*="protonmail_signature"]',
  '[class*="moz-signature"]',
  '#Signature',
  '#signature',
].join(', ');

const MAX_ATTRIBUTION_SCAN_STEPS = 12;

/**
 * Marks the trailing quoted run of `doc`, if there is one, by moving it into a
 * container element and inserting a toggle button before it. Returns the
 * container so the caller can wire the toggle, or `null` when there is nothing
 * worth collapsing.
 *
 * Mutates `doc`. Safe to call on any parsed body; every failure mode returns
 * `null` and leaves the document untouched.
 */
export function markQuotedEmailContent(doc: Document): HTMLElement | null {
  const body = doc.body;
  if (!body) return null;

  // Already marked (a re-render of an body we produced) — hand back the same
  // container rather than nesting a second toggle inside the first.
  const existing = body.querySelector<HTMLElement>(`[${QUOTED_CONTENT_ATTRIBUTE}]`);
  if (existing) return existing;

  const quotedNodes = collectQuotedNodes(doc);
  if (quotedNodes.size === 0) return null;

  // Signatures do not make a quote collapsible on their own, but they must not
  // block one either — hence a separate set that the follow-check sees through.
  const skippable = new Set<Node>([
    ...quotedNodes,
    ...doc.body.querySelectorAll(SIGNATURE_SELECTORS),
  ]);
  const collapsible = [...quotedNodes].filter(
    (node) => !isFollowedByUnquotedContent(node, skippable)
  );
  if (collapsible.length === 0) return null;

  const start = extendQuoteStart(earliestNode(collapsible));
  // A message that is nothing but a quote (a bare forward) has no reply to
  // show above the toggle — collapsing it would render an empty message.
  if (!hasVisibleContentBefore(start, body)) return null;

  return wrapQuotedRun(doc, start);
}

/**
 * Splits plain-text bodies at the first quoted line. Plain text has only the
 * `>` convention and the same attribution/separator lines, and no nesting to
 * reason about, so this stays a line scan rather than a DOM walk.
 */
export function splitQuotedPlainText(lines: string[]): {
  visible: string[];
  quoted: string[];
} {
  const startIndex = lines.findIndex((line, index) => {
    const value = line.trim();
    if (!value) return false;
    if (value.startsWith('>')) return true;
    if (QUOTE_MARKER_TEXT_PATTERNS.some((pattern) => pattern.test(value))) return true;
    // An attribution only introduces a quote when something follows it.
    return index < lines.length - 1 && ATTRIBUTION_PATTERNS.some((p) => p.test(value));
  });

  if (startIndex <= 0) return { visible: lines, quoted: [] };
  return { visible: lines.slice(0, startIndex), quoted: lines.slice(startIndex) };
}

function collectQuotedNodes(doc: Document): Set<Node> {
  const quoted = new Set<Node>();

  for (const element of doc.body.querySelectorAll(QUOTE_CONTAINER_SELECTORS)) {
    quoted.add(element);
  }

  for (const marker of findQuoteMarkers(doc)) {
    for (const node of collectNodesFrom(marker, doc.body)) quoted.add(node);
  }

  return quoted;
}

/** Elements after which everything is quoted, whatever their own markup. */
function findQuoteMarkers(doc: Document): Element[] {
  const markers: Element[] = [];

  for (const element of doc.body.querySelectorAll(QUOTE_MARKER_SELECTORS)) {
    markers.push(element);
  }

  for (const element of doc.body.querySelectorAll<HTMLElement>('*')) {
    if (markers.includes(element)) continue;

    const style = element.getAttribute('style');
    if (style && OUTLOOK_DIVIDER_STYLE_PATTERN.test(style)) {
      markers.push(element);
      continue;
    }

    if (hasOnlyText(element) && matchesMarkerText(element.textContent ?? '')) {
      markers.push(element);
      continue;
    }

    if (isQuoteHeaderBlock(element)) markers.push(element);
  }

  return markers;
}

function matchesMarkerText(value: string): boolean {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return false;
  return QUOTE_MARKER_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * A `From:`/`Sent:`/`To:`/`Subject:` block, which Outlook emits above a quoted
 * original. Three labels is the threshold: two ("To:", "Subject:") also appear
 * in ordinary business prose, three together do not.
 */
function isQuoteHeaderBlock(element: Element): boolean {
  const labels = new Set<string>();

  for (const child of element.querySelectorAll('b, strong, span, font')) {
    const text = (child.textContent ?? '').trim().replace(/\s*:$/, '');
    if (!text || text.length > 20 || !(child.textContent ?? '').trim().endsWith(':')) continue;
    const label = text.toLowerCase();
    if (QUOTE_HEADER_LABELS.has(label)) labels.add(label);
  }

  if (labels.size < 3) return false;
  // The block itself, not an ancestor that merely contains it — otherwise the
  // whole body matches and nothing is ever left visible.
  return !Array.from(element.children).some((child) => isQuoteHeaderBlock(child));
}

function hasOnlyText(element: Element): boolean {
  return Array.from(element.childNodes).every(
    (node) => node.nodeType === Node.TEXT_NODE || isLineBreak(node)
  );
}

/** The node and everything after it in document order, walking up to `root`. */
function collectNodesFrom(start: Node, root: Node): Node[] {
  const nodes: Node[] = [];
  let cursor: Node | null = start;

  while (cursor && cursor !== root) {
    nodes.push(cursor);
    while (cursor && cursor !== root && !cursor.nextSibling) {
      cursor = cursor.parentNode;
    }
    if (!cursor || cursor === root) break;
    cursor = cursor.nextSibling;
  }

  return nodes;
}

/**
 * True when readable content follows `node` that is not itself quoted — the
 * signal that this quote is being replied to inline and must stay visible.
 */
function isFollowedByUnquotedContent(node: Node, quoted: Set<Node>): boolean {
  const seen = new Set<Node>();
  let head: Node | null = node;

  while (head) {
    while (head && !head.nextSibling) head = head.parentNode;
    if (!head) break;
    head = head.nextSibling;
    if (!head) break;

    const pile: Node[] = [head];
    let current: Node | undefined;

    while ((current = pile.pop())) {
      if (seen.has(current) || quoted.has(current)) continue;
      seen.add(current);

      if (isVisibleContent(current)) return true;
      pile.push(...Array.from(current.childNodes));
    }
  }

  return false;
}

function isVisibleContent(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
  if (!isElement(node)) return false;
  if (node.tagName === 'IMG') return !isTrackingPixel(node);
  return false;
}

/**
 * Senders end messages with a 1×1 beacon; treating it as content would keep
 * every quote expanded.
 */
function isTrackingPixel(image: Element): boolean {
  const read = (attribute: string, styleValue: string) => {
    const raw = image.getAttribute(attribute) ?? styleValue.replace('px', '');
    const parsed = Number(raw);
    return Number.isFinite(parsed) && raw !== '' ? parsed : Number.POSITIVE_INFINITY;
  };
  const style = (image as HTMLElement).style;
  return read('width', style?.width ?? '') <= 1 && read('height', style?.height ?? '') <= 1;
}

function earliestNode(nodes: Node[]): Node {
  return nodes.reduce((earliest, node) => {
    const position = node.compareDocumentPosition(earliest);
    const isBefore =
      Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING) ||
      Boolean(position & Node.DOCUMENT_POSITION_CONTAINED_BY);
    return isBefore ? node : earliest;
  });
}

/**
 * Walks backwards from the quote to pick up the attribution line and any
 * divider (`<hr>`) that introduces it, so the toggle hides a complete unit.
 */
function extendQuoteStart(start: Node): Node {
  let result = start;
  let cursor = previousContentNode(start);
  let text = '';
  let steps = 0;

  while (cursor && steps < MAX_ATTRIBUTION_SCAN_STEPS) {
    steps += 1;

    if (isElement(cursor) && cursor.tagName === 'HR') {
      // Outlook writes `<hr>` then the header block; keep the rule with it and
      // carry on looking for an attribution above.
      result = cursor;
      text = '';
      cursor = previousContentNode(cursor);
      continue;
    }

    if (isElement(cursor) && cursor.matches(ATTRIBUTION_SELECTORS)) return cursor;

    const value = (cursor.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!value) {
      cursor = previousContentNode(cursor);
      continue;
    }

    text = `${value} ${text}`.trim();
    if (ATTRIBUTION_PATTERNS.some((pattern) => pattern.test(text))) return cursor;
    // Content that is not part of an attribution means the quote starts here.
    if (!ATTRIBUTION_HINT_PATTERN.test(text)) break;

    cursor = previousContentNode(cursor);
  }

  return result;
}

function previousContentNode(node: Node): Node | null {
  if (node.previousSibling) return node.previousSibling;
  const parent = node.parentNode;
  if (!parent || isBodyElement(parent)) return null;
  return previousContentNode(parent);
}

function hasVisibleContentBefore(start: Node, body: Node): boolean {
  const stack: Node[] = [body];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === start) return false;
    // Anything inside the quote itself is past the boundary.
    if (node !== body && start.contains?.(node)) continue;

    const position = start.compareDocumentPosition(node);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) continue;

    if (node !== body && isVisibleContent(node)) return true;
    const children = Array.from(node.childNodes);
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]!);
  }

  return false;
}

/**
 * Moves `start` and everything after it into one container, preserving the
 * ancestor chain so a quote that begins mid-paragraph keeps the styling its
 * wrapper gave it. Returns the container.
 */
function wrapQuotedRun(doc: Document, start: Node): HTMLElement | null {
  const body = doc.body;
  const ancestors: Node[] = [];
  for (let parent = start.parentNode; parent && parent !== body; parent = parent.parentNode) {
    ancestors.push(parent);
  }

  // A marker before the quote's top-level ancestor, so the container can be
  // placed correctly whether or not that ancestor survives the split. It goes
  // *before* the ancestor rather than after so the detach pass below cannot
  // sweep it into the quote.
  const topLevel = ancestors.length > 0 ? ancestors[ancestors.length - 1]! : start;
  const anchor = doc.createElement('div');
  body.insertBefore(anchor, topLevel);

  let carried = detachSelfAndFollowing(start);

  for (const ancestor of ancestors) {
    const shell = ancestor.cloneNode(false);
    for (const node of carried) shell.appendChild(node);

    const following = detachFollowing(ancestor);
    carried = [shell, ...following];

    if (isEffectivelyEmpty(ancestor)) ancestor.parentNode?.removeChild(ancestor);
  }

  const container = doc.createElement('div');
  container.setAttribute(QUOTED_CONTENT_ATTRIBUTE, 'true');
  container.hidden = true;
  for (const node of carried) container.appendChild(node);

  const toggle = createQuoteToggle(doc);
  if (body.contains(topLevel)) {
    // The ancestor kept unquoted content, so the quote belongs after it.
    (topLevel as ChildNode).after(toggle, container);
    anchor.remove();
  } else {
    anchor.replaceWith(toggle, container);
  }

  return container;
}

function detachSelfAndFollowing(start: Node): Node[] {
  const nodes: Node[] = [];
  let cursor: Node | null = start;

  while (cursor) {
    const next: Node | null = cursor.nextSibling;
    cursor.parentNode?.removeChild(cursor);
    nodes.push(cursor);
    cursor = next;
  }

  return nodes;
}

function detachFollowing(node: Node): Node[] {
  const nodes: Node[] = [];
  let cursor: Node | null = node.nextSibling;

  while (cursor) {
    const next: Node | null = cursor.nextSibling;
    cursor.parentNode?.removeChild(cursor);
    nodes.push(cursor);
    cursor = next;
  }

  return nodes;
}

function isEffectivelyEmpty(node: Node): boolean {
  return !Array.from(node.childNodes).some(
    (child) => isVisibleContent(child) || (isElement(child) && child.childNodes.length > 0)
  );
}

/**
 * The toggle itself: three dots in a pill, matching how every mail client
 * renders trimmed content. Dots are elements rather than text so the body's
 * contrast pass leaves them alone, and the label lives on `aria-label` so
 * screen readers get a sentence instead of punctuation.
 */
function createQuoteToggle(doc: Document): HTMLElement {
  const toggle = doc.createElement('button');
  toggle.setAttribute('type', 'button');
  toggle.setAttribute(QUOTE_TOGGLE_ATTRIBUTE, 'true');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Show trimmed content');
  toggle.setAttribute('title', 'Show trimmed content');

  for (let index = 0; index < 3; index += 1) {
    const dot = doc.createElement('span');
    dot.setAttribute('data-elli-quote-dot', 'true');
    toggle.appendChild(dot);
  }

  return toggle;
}

function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isBodyElement(node: Node): boolean {
  return isElement(node) && node.tagName === 'BODY';
}

function isLineBreak(node: Node): boolean {
  return isElement(node) && node.tagName === 'BR';
}
