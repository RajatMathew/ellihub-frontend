/**
 * Finds the quoted history in a rendered email body so it can be collapsed
 * behind a toggle (elli-ui#788).
 *
 * ## Why this is not just "hide every blockquote"
 *
 * Clients mark a quote in two structurally different ways, and conflating them
 * is what broke the first attempt at this:
 *
 * - **Containers** wrap the quote in an element — `<blockquote>`,
 *   `div.gmail_quote`, `.yahoo_quoted`. The element *is* the quote.
 * - **Boundaries** mark a point and leave the quote as following siblings —
 *   Outlook's `#divRplyFwdMsg`, its `border-top` divider,
 *   `-----Original Message-----`. Nothing wraps anything.
 *
 * The first version guarded both with one rule: "only collapse a quote if
 * nothing unquoted follows it", which protects inline replies. For containers
 * that works. For boundaries it is **circular** — a boundary declares that
 * everything after it is quoted, so the guard it is checked against was
 * populated by the boundary itself and can never veto. Measured against 17k
 * real bodies, ours are overwhelmingly boundary-marked, so the guard was
 * effectively off for almost all of them; one message had its author's own
 * signature swallowed with 16 characters left visible.
 *
 * ## What this does instead
 *
 * It scans the message's top-level children in document order and classifies
 * each one *by its own content* — sender's writing, signature, quote, or
 * trivia — then puts the boundary after the last thing the sender wrote. That
 * question ("is this the sender's own content?") is answerable without
 * reference to any candidate, so it cannot go circular, and it is the question
 * that actually matters: never hide something this person wrote.
 *
 * The quote is marked, never deleted. Everything stays one click away.
 */

export const QUOTED_CONTENT_ATTRIBUTE = 'data-elli-quoted-content';
export const QUOTE_TOGGLE_ATTRIBUTE = 'data-elli-quote-toggle';

/**
 * Containers each client wraps a quote in. Substring matching on `class` is
 * deliberate: Outlook rewrites foreign class names with an `x_` prefix when it
 * quotes them (`x_gmail_quote`), and Gmail has shipped both `gmail_quote` and
 * `gmail_quote_container`.
 *
 * Only `blockquote` and the Gmail/Yahoo entries appear in our own corpus. The
 * rest are kept deliberately for tenants on other providers, and are covered by
 * fixtures rather than by corpus evidence.
 */
const QUOTE_CONTAINER_SELECTORS = [
  '[class*="gmail_quote"]', // Gmail, old and new markup
  '[class*="yahoo_quoted"]', // Yahoo and AOL
  '[class*="protonmail_quote"]', // Proton Mail
  '[class*="zmail_extra"]', // Zoho Mail
  'blockquote',
].join(', ');

/**
 * Elements that mark a boundary rather than wrapping the quote. `divRplyFwdMsg`
 * is matched by substring because a thread nests one per reply round, each
 * prefixed a further `x_` by Outlook — real messages in our corpus reach
 * `#x_x_x_divRplyFwdMsg`.
 */
const QUOTE_BOUNDARY_SELECTORS = [
  '[id*="divRplyFwdMsg"]',
  '[id^="OLK_SRC_BODY_SECTION"]',
  '[class*="moz-cite-prefix"]', // Thunderbird's attribution line
  '[class*="gmail_attr"]',
].join(', ');

/** Separator lines clients write instead of any element marker. */
const BOUNDARY_TEXT_PATTERNS = [
  // `message` is optional: a real Outlook variant in the corpus writes the
  // separator as `------------------ Original ------------------`, and
  // requiring the second word left that line sitting under the reply with the
  // history it introduces collapsed away beneath it (elli-ui#942). Dashes on
  // both sides of the word are what make it unambiguous — "original" in prose
  // has no rules around it.
  /^-{2,}\s*original(?:\s+message)?\s*-{2,}$/i,
  /^-{2,}\s*forwarded(?:\s+message)?\s*-{2,}$/i,
  /^-{2,}\s*ursprüngliche nachricht\s*-{2,}$/i,
  /^-{2,}\s*mensaje original\s*-{2,}$/i,
  /^-{2,}\s*message transféré\s*-{2,}$/i,
  /^begin forwarded message:?$/i,
  /^_{10,}$/,
];

/**
 * Attribution lines ("On <date>, <sender> wrote:"). Anchored at the end so a
 * message that merely mentions the phrase mid-sentence does not match.
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

/**
 * Outlook's divider above a quoted original. Matches the shape rather than the
 * values: both `#B5C4DF` and `#E1E1E1`, and inch and centimetre paddings, occur
 * in the wild.
 */
const OUTLOOK_DIVIDER_STYLE_PATTERN = /border-top:\s*solid\s*#[0-9a-f]{3,6}\s*1\.0pt/i;

/**
 * How much of an element must be signature before the element counts as one.
 * Below this it is a container that merely holds a signature among other things.
 */
const SIGNATURE_WRAPPER_RATIO = 0.6;

/** Signature blocks — the sender's own content, never hidden inside a quote. */
const SIGNATURE_SELECTORS = [
  '[class*="gmail_signature"]',
  // Ours, added by the mailbox composer (email-signature.ts).
  '[class*="elli-signature"]',
  '[class*="protonmail_signature"]',
  '[class*="moz-signature"]',
  '[id="Signature"]',
  '[id="signature"]',
].join(', ');

/** Header labels Outlook writes above a quoted original, in the languages seen. */
const HEADER_LABELS = new Set([
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
]);

/**
 * A genuine reply-header block is a short run of labels — around 180 characters
 * in our corpus. Requiring a ceiling stops a wrapper that merely *contains* one
 * from being mistaken for the header itself, which is how a whole message ends
 * up classified as quoted.
 */
const MAX_HEADER_BLOCK_CHARS = 600;

/** Bound on the label scan, so a pathological subtree cannot dominate a render. */
const MAX_HEADER_SCAN_ELEMENTS = 4000;

/**
 * A body with nothing at all above the quote is a bare forward: collapsing it
 * would leave an empty card and a dot pill. The bar is deliberately "anything
 * at all" rather than a word count — "Thanks!", "Approved", "OK" are complete
 * replies and by far the most common ones in a construction thread.
 */
const MIN_VISIBLE_CHARS = 1;

/**
 * How many sibling header rows have to sit together before they are a reply
 * header rather than prose. Matches the three-distinct-labels threshold
 * `containsHeaderBlock` applies inside a single element, for the same reason:
 * `To:` and `Subject:` occur in ordinary business writing, three together do not.
 */
const MIN_HEADER_ROWS_FOR_BOUNDARY = 3;

/** Ceiling on one row of a header block — a `From:` line with a long display name. */
const MAX_HEADER_ROW_CHARS = 200;

type ChildKind =
  | 'sender'
  | 'signature'
  | 'quote-container'
  | 'quote-boundary'
  /**
   * One line of a reply header (`From:` …) standing as its own element.
   *
   * It exists because `containsHeaderBlock` can only see a header block held
   * **inside a single element**, and the common shape writes one `<div>` per
   * row — Outlook does, and so does our own composer. Each row alone carries
   * one label, so every one of them classified as the sender's own writing,
   * and a reply to a reply then had `hasSenderContentBefore` descend into the
   * quote it had already found: the outer `From:/Sent:/To:/Subject:` block
   * stayed on screen and only the inner history collapsed (elli-ui#1176).
   *
   * A row is only meaningful next to its neighbours, so this kind is resolved
   * by `resolveHeaderRuns` before anything reads it: a run of three or more
   * becomes one boundary, and a shorter run goes back to being prose.
   */
  | 'quote-header'
  | 'trivia';

/**
 * Marks the quoted run of `doc`, moving it into a container and inserting a
 * toggle before it. Returns the container, or `null` when there is nothing
 * worth collapsing. Mutates `doc`; every failure mode leaves it untouched.
 */
export function markQuotedEmailContent(doc: Document): HTMLElement | null {
  const body = doc.body;
  if (!body) return null;

  // Already marked (a re-render of a body we produced) — hand back the same
  // container rather than nesting a second toggle inside the first.
  const existing = body.querySelector<HTMLElement>(`[${QUOTED_CONTENT_ATTRIBUTE}]`);
  if (existing) return existing;

  const run = findQuoteRun(layoutRoot(body), 0);
  if (!run) return null;

  // A message that is nothing but a quote (a bare forward) has no reply to show
  // above the toggle; collapsing it would render an empty card.
  if (visibleCharsBefore(run.start, body) < MIN_VISIBLE_CHARS) return null;

  return wrapQuotedRun(doc, run);
}

/**
 * Splits plain-text bodies at the first quoted line. Plain text has only the
 * `>` convention and the same attribution and separator lines, and no nesting
 * to reason about, so this stays a line scan.
 */
export function splitQuotedPlainText(lines: string[]): { visible: string[]; quoted: string[] } {
  const startIndex = lines.findIndex((line, index) => {
    const value = line.trim();
    if (!value) return false;
    if (value.startsWith('>')) return true;
    if (BOUNDARY_TEXT_PATTERNS.some((pattern) => pattern.test(value))) return true;
    // An attribution only introduces a quote when something follows it.
    return index < lines.length - 1 && ATTRIBUTION_PATTERNS.some((p) => p.test(value));
  });

  if (startIndex <= 0) return { visible: lines, quoted: [] };
  return { visible: lines.slice(0, startIndex), quoted: lines.slice(startIndex) };
}

/**
 * Messages arrive wrapped in one or more layout shells — `div.WordSection1`
 * from Outlook, `div[dir=ltr]` from Gmail. Descend through single-child
 * wrappers so the scan runs over the message's real structure rather than over
 * one element that contains everything.
 *
 * The filter runs over **child nodes, not child elements**. A reply whose text
 * was typed straight into a contenteditable is a bare text node with no
 * wrapper, so `children` does not see it — and a body of `testing<div>…quote…`
 * then looks like a single-child shell, which sent this descending *into* the
 * quote. From in there the header rows are one label each, three-in-one-element
 * never matches, and the whole quote is classified as the sender's writing:
 * nothing collapses. Our own composer emits exactly that shape (elli-ui#1176),
 * and so does anything else that puts loose text above a quote.
 */
function layoutRoot(body: HTMLElement): Element {
  let root: Element = body;
  for (let depth = 0; depth < 4; depth += 1) {
    const content = Array.from(root.childNodes).filter((child) => !isTrivia(child));
    if (content.length !== 1) break;
    const only = content[0]!;
    if (!isElement(only) || only.children.length === 0) break;
    root = only;
  }
  return root;
}

export type QuoteRun = {
  /** First node of the quoted run. */
  start: Node;
  /** First node *after* the run, when something of the sender's trails it. */
  endBefore: Node | null;
};

/**
 * The heart of it: scan `root`'s children, classify each by its own content,
 * and locate the quoted run.
 *
 * Two rules, and the difference between them is the whole point:
 *
 * - The boundary is placed after the last thing the sender wrote that still has
 *   quoted history below it. Prose or a signature in that position *blocks* a
 *   boundary above it from being chosen, which is what stopped a message having
 *   its own signature hidden.
 * - A **container** quote is additionally required to have nothing but quote,
 *   trivia or a trailing signature after it. That is the inline-reply guard,
 *   and it can only be applied to containers: a **boundary** marker declares
 *   that the prose after it is the quoted original, so the same test asked of a
 *   boundary would reject every ordinary Outlook reply.
 */
function findQuoteRun(root: Element, depth: number): QuoteRun | null {
  const children = Array.from(root.children);
  if (children.length === 0) return null;

  const kinds = classifyChildren(children);
  const isQuote = (kind: ChildKind) => kind === 'quote-container' || kind === 'quote-boundary';

  // Content of the sender's that still has quoted history below it. Anything at
  // or before such an index cannot be the boundary.
  let lastBlocking = -1;
  for (let index = 0; index < children.length; index += 1) {
    const kind = kinds[index]!;
    if (kind !== 'sender' && kind !== 'signature') continue;
    if (kinds.slice(index + 1).some(isQuote)) lastBlocking = index;
  }

  const boundary = kinds.findIndex((kind, index) => isQuote(kind) && index > lastBlocking);
  if (boundary === -1) return null;

  const trailing = kinds.slice(boundary + 1);
  if (kinds[boundary] === 'quote-container' && trailing.some((kind) => kind === 'sender')) {
    // Sender's writing below a container quote: an inline reply, not history.
    return null;
  }

  // A signature the client appended below the history belongs to the sender and
  // stays visible, so the run stops before it.
  const trailingSignature = kinds.findIndex(
    (kind, index) => index > boundary && kind === 'signature'
  );

  const child = children[boundary]!;

  // The quote may begin partway inside this child — a wrapper holding a line of
  // reply text and then the history. One level down resolves that; deeper than
  // a few levels the structure is the quote's own nesting, not a split point.
  if (depth < 3 && hasSenderContentBefore(child)) {
    const inner = findQuoteRun(child, depth + 1);
    if (inner) return inner;
  }

  return {
    start: extendToAttribution(child),
    endBefore: trailingSignature === -1 ? null : children[trailingSignature]!,
  };
}

/** Does this element hold the sender's own writing above the quote inside it? */
function hasSenderContentBefore(element: Element): boolean {
  const children = Array.from(element.children);
  if (children.length < 2) return false;
  const kinds = classifyChildren(children);
  const firstQuote = kinds.findIndex(
    (kind) => kind === 'quote-container' || kind === 'quote-boundary'
  );
  if (firstQuote <= 0) return false;
  return kinds.slice(0, firstQuote).some((kind) => kind === 'sender' || kind === 'signature');
}

/**
 * Classify a set of siblings, then resolve the header rows among them.
 *
 * Every read of a child's kind goes through here rather than through
 * `classifyChild` directly, because a header row's meaning is not a property of
 * the row — it is a property of the run it sits in.
 */
function classifyChildren(children: Element[]): ChildKind[] {
  return resolveHeaderRuns(children.map(classifyChild));
}

/**
 * Turn runs of `quote-header` into the thing they actually are.
 *
 * Three or more in a row are a reply header, so the first becomes the boundary
 * and the rest stay header rows — neither the sender's writing nor a second
 * boundary. A shorter run is prose that happens to open with a label (`To: the
 * site team — please note…`) and goes back to `sender`, which keeps it visible
 * and lets it block a boundary above it, exactly as before this kind existed.
 *
 * Spacers between rows do not break a run; Outlook puts empty paragraphs there.
 */
function resolveHeaderRuns(kinds: ChildKind[]): ChildKind[] {
  const resolved = [...kinds];
  let start = -1;
  let count = 0;

  const flush = (end: number) => {
    if (start < 0) return;
    if (count >= MIN_HEADER_ROWS_FOR_BOUNDARY) {
      resolved[start] = 'quote-boundary';
    } else {
      for (let index = start; index < end; index += 1) {
        if (resolved[index] === 'quote-header') resolved[index] = 'sender';
      }
    }
    start = -1;
    count = 0;
  };

  for (let index = 0; index < resolved.length; index += 1) {
    const kind = resolved[index]!;
    if (kind === 'quote-header') {
      if (start < 0) start = index;
      count += 1;
    } else if (kind !== 'trivia' || start < 0) {
      flush(index);
    }
  }
  flush(resolved.length);

  return resolved;
}

const classificationCache = new WeakMap<Element, ChildKind>();

function classifyChild(element: Element): ChildKind {
  const cached = classificationCache.get(element);
  if (cached) return cached;
  const kind = computeChildKind(element);
  classificationCache.set(element, kind);
  return kind;
}

function computeChildKind(element: Element): ChildKind {
  if (isSignature(element)) return 'signature';
  if (isQuoteContainer(element)) return 'quote-container';
  if (isQuoteBoundary(element)) return 'quote-boundary';
  if (isTrivia(element)) return 'trivia';
  // Checked after the boundary rules: an element holding the whole header block
  // is a boundary in its own right, and only a single row reaches this.
  if (isHeaderRow(element)) return 'quote-header';
  return 'sender';
}

/**
 * A signature block, or a thin wrapper around one.
 *
 * The ratio test matters: "contains a signature anywhere" would classify a
 * wrapper holding the entire message as a signature — and since signature is
 * checked first, the quote inside it would never be looked for. One real body
 * had its whole content in such a wrapper and no quote was found at all.
 */
function isSignature(element: Element): boolean {
  if (element.matches(SIGNATURE_SELECTORS)) return true;

  const inner = element.querySelector(SIGNATURE_SELECTORS);
  if (!inner) return false;

  const innerLength = normalize(inner.textContent ?? '').length;
  const outerLength = normalize(element.textContent ?? '').length;
  return outerLength > 0 && innerLength / outerLength >= SIGNATURE_WRAPPER_RATIO;
}

/** The element is, or wraps, a quote container — the quote is inside it. */
function isQuoteContainer(element: Element): boolean {
  return (
    element.matches(QUOTE_CONTAINER_SELECTORS) ||
    element.querySelector(QUOTE_CONTAINER_SELECTORS) !== null
  );
}

/** The element marks a point after which the rest of the message is history. */
function isQuoteBoundary(element: Element): boolean {
  if (
    element.matches(QUOTE_BOUNDARY_SELECTORS) ||
    element.querySelector(QUOTE_BOUNDARY_SELECTORS) !== null
  ) {
    return true;
  }
  if (hasOutlookDivider(element)) return true;
  if (hasBoundaryText(element)) return true;
  if (containsHeaderBlock(element)) return true;
  return isAttribution(element);
}

function hasOutlookDivider(element: Element): boolean {
  if (OUTLOOK_DIVIDER_STYLE_PATTERN.test(element.getAttribute('style') ?? '')) return true;
  return Array.from(element.querySelectorAll('[style]')).some((node) =>
    OUTLOOK_DIVIDER_STYLE_PATTERN.test(node.getAttribute('style') ?? '')
  );
}

function hasBoundaryText(element: Element): boolean {
  const text = normalize(element.textContent ?? '');
  if (!text || text.length > 200) return false;
  return BOUNDARY_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function isAttribution(element: Element): boolean {
  const text = normalize(element.textContent ?? '');
  if (!text || text.length > 400) return false;
  return ATTRIBUTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * A `From:`/`Sent:`/`To:`/`Subject:` run. Three labels is the threshold — two
 * ("To:", "Subject:") occur in ordinary business prose, three together do not.
 *
 * The size ceiling is applied to the element that *holds the labels*, not to
 * the element being classified. Checking the outer element instead is subtly
 * wrong in both directions: it misses a header nested inside a large wrapper
 * (a real message in the corpus, 779 characters, went undetected that way) and
 * it lets a wrapper stand in for the header it contains.
 */
function containsHeaderBlock(element: Element): boolean {
  const labelNodes = findHeaderLabelNodes(element);
  if (new Set(labelNodes.map(([, label]) => label)).size < 3) return false;

  // Walk up from the first label to the smallest element that holds three of
  // them: that is the header block, and its size is what the ceiling judges.
  //
  // Deliberately not a scan of every descendant. That version called
  // `querySelectorAll` once per candidate, which is quadratic in the size of
  // the body — on a large real message it stalled for minutes, and it would
  // have done the same on the render path, not just in the harness.
  const first = labelNodes[0]?.[0];
  if (!first) return false;

  for (
    let ancestor = first.parentElement;
    ancestor && ancestor !== element.parentElement;
    ancestor = ancestor.parentElement
  ) {
    const labels = new Set(
      labelNodes.filter(([node]) => ancestor.contains(node)).map(([, label]) => label)
    );
    if (labels.size < 3) continue;
    return normalize(ancestor.textContent ?? '').length <= MAX_HEADER_BLOCK_CHARS;
  }

  return false;
}

/**
 * A single line of a reply header — `From: Akash P <akashp2003@outlook.com>`.
 *
 * Short, and carrying a label, because the run is what gives it meaning:
 * `resolveHeaderRuns` needs three together before it will treat any of them as
 * a quote. Length is what keeps a large element that merely opens with a label
 * out.
 */
function isHeaderRow(element: Element): boolean {
  const text = normalize(element.textContent ?? '');
  if (!text || text.length > MAX_HEADER_ROW_CHARS) return false;
  return findHeaderLabelNodes(element).length > 0;
}

/** Every `From:`-style label under `element`, found in a single pass. */
function findHeaderLabelNodes(element: Element): Array<[Element, string]> {
  const found: Array<[Element, string]> = [];
  const nodes = element.querySelectorAll('b, strong, span, font');

  for (let index = 0; index < nodes.length && index < MAX_HEADER_SCAN_ELEMENTS; index += 1) {
    const node = nodes[index]!;
    const text = (node.textContent ?? '').trim();
    if (!text.endsWith(':') || text.length > 20) continue;
    const label = text.replace(/\s*:$/, '').toLowerCase();
    if (HEADER_LABELS.has(label)) found.push([node, label]);
  }

  return found;
}

/**
 * Pull an attribution line sitting immediately above the quote into the run, so
 * the toggle does not leave a dangling "On Thursday, Rajat wrote:" behind.
 */
function extendToAttribution(start: Element): Node {
  let candidate: Node = start;
  let cursor = start.previousElementSibling;
  let steps = 0;

  while (cursor && steps < 4) {
    steps += 1;
    if (cursor.tagName === 'HR') {
      // Outlook writes `<hr>` then the header block; keep the rule with it.
      candidate = cursor;
      cursor = cursor.previousElementSibling;
      continue;
    }
    if (isTrivia(cursor)) {
      cursor = cursor.previousElementSibling;
      continue;
    }
    if (isAttribution(cursor)) return cursor;
    break;
  }

  return candidate;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** No text and no image worth showing — spacers, empty paragraphs, `<br>`. */
function isTrivia(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) return !node.textContent?.trim();
  if (!isElement(node)) return true;
  if (normalize(node.textContent ?? '')) return false;
  return !Array.from(node.querySelectorAll('img')).some((image) => !isTrackingPixel(image));
}

/**
 * Senders end messages with a 1×1 beacon; counting it as content would keep
 * every quote below one expanded.
 */
function isTrackingPixel(image: Element): boolean {
  const read = (attribute: string, styleValue: string) => {
    const raw = image.getAttribute(attribute) ?? styleValue.replace('px', '');
    const parsed = Number(raw);
    return raw !== '' && Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  };
  const style = (image as HTMLElement).style;
  return read('width', style?.width ?? '') <= 1 && read('height', style?.height ?? '') <= 1;
}

function visibleCharsBefore(start: Node, body: Node): number {
  const total = normalize(body.textContent ?? '').length;
  const quoted = normalize(collectFrom(start).join(' ')).length;
  return Math.max(total - quoted, 0);
}

/** Text of `start` and everything after it, for measuring what a collapse hides. */
function collectFrom(start: Node): string[] {
  const parts: string[] = [];
  let cursor: Node | null = start;
  while (cursor) {
    parts.push(cursor.textContent ?? '');
    while (cursor && !cursor.nextSibling) cursor = cursor.parentNode;
    cursor = cursor?.nextSibling ?? null;
    if (cursor && isBodyElement(cursor)) break;
  }
  return parts;
}

/**
 * Moves `start` and everything after it into one container, preserving the
 * ancestor chain so a quote beginning mid-wrapper keeps the styling that
 * wrapper gave it, and inserts the toggle before it.
 */
function wrapQuotedRun(doc: Document, run: QuoteRun): HTMLElement | null {
  const { start, endBefore } = run;
  const body = doc.body;
  const ancestors: Node[] = [];
  for (let parent = start.parentNode; parent && parent !== body; parent = parent.parentNode) {
    ancestors.push(parent);
  }

  // A marker before the quote's top-level ancestor, so the container can be
  // placed correctly whether or not that ancestor survives the split. It goes
  // *before* the ancestor so the detach pass below cannot sweep it into the
  // quote.
  const topLevel = ancestors.length > 0 ? ancestors[ancestors.length - 1]! : start;
  const anchor = doc.createElement('div');
  body.insertBefore(anchor, topLevel);

  let carried = detachSelfAndFollowing(start, endBefore);

  for (const ancestor of ancestors) {
    const shell = ancestor.cloneNode(false);
    for (const node of carried) shell.appendChild(node);

    const following = detachFollowing(ancestor, endBefore);
    carried = [shell, ...following];

    if (isTrivia(ancestor)) ancestor.parentNode?.removeChild(ancestor);
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

/** Detach `start` and its following siblings, stopping at `endBefore`. */
function detachSelfAndFollowing(start: Node, endBefore: Node | null): Node[] {
  const nodes: Node[] = [];
  let cursor: Node | null = start;

  while (cursor && cursor !== endBefore) {
    const next: Node | null = cursor.nextSibling;
    cursor.parentNode?.removeChild(cursor);
    nodes.push(cursor);
    cursor = next;
  }

  return nodes;
}

function detachFollowing(node: Node, endBefore: Node | null): Node[] {
  const nodes: Node[] = [];
  let cursor: Node | null = node.nextSibling;

  while (cursor && cursor !== endBefore) {
    const next: Node | null = cursor.nextSibling;
    cursor.parentNode?.removeChild(cursor);
    nodes.push(cursor);
    cursor = next;
  }

  return nodes;
}

/**
 * Three dots in a pill, matching how every mail client renders trimmed content.
 * Dots are elements rather than text so the label can live on `aria-label` and
 * a screen reader gets a sentence instead of punctuation.
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

export const emailQuotedContentInternals = {
  classifyChild,
  layoutRoot,
  findQuoteRun,
};
