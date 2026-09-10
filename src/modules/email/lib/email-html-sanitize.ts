import {
  ALLOWED_EMAIL_TAGS,
  DROPPED_EMAIL_TAGS,
  DROPPED_VOID_EMAIL_TAGS,
  IMPLICITLY_CLOSED_BY,
  isAllowedEmailAttribute,
  isSafeEmailUrl,
  sanitizeInlineStyle,
  URL_EMAIL_ATTRIBUTES,
  VOID_EMAIL_TAGS,
} from './email-html-policy';

/**
 * A self-contained HTML sanitizer for the compose editor.
 *
 * It deliberately does not lean on `DOMParser`: the same function has to run in
 * the browser, where pasted markup lands in a contenteditable, and in unit tests,
 * so the rules that guard a sent message are the rules that are actually proven.
 *
 * Every token is re-emitted rather than passed through — tag names come from the
 * allowlist, attribute values are re-quoted and escaped, text is escaped, and the
 * open-element stack is unwound at the end. The output is therefore balanced,
 * fully escaped markup whose parse tree is the one written here, which is what
 * closes the door on mutation-XSS tricks that rely on a parser disagreeing with
 * its sanitizer.
 */
export interface SanitizeEmailHtmlOptions {
  /** Turns bare URLs in text into links. Used on the way out, never while typing. */
  linkifyText?: boolean;
}

const OPEN_TAG_PATTERN = /^<([a-zA-Z][^\s>/]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/;
const CLOSE_TAG_PATTERN = /^<\/\s*([a-zA-Z][^\s>/]*)[^>]*>/;
const ATTRIBUTE_PATTERN = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;
const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_URL_PUNCTUATION_PATTERN = /[),.;:!?]+$/;
/** `&` only becomes `&amp;` when it does not already open a valid entity. */
const BARE_AMPERSAND_PATTERN = /&(?![a-zA-Z][a-zA-Z0-9]{0,31};|#\d{1,7};|#[xX][0-9a-fA-F]{1,6};)/g;
/** Inside these, a bare URL is content, not a link the author forgot to make. */
const NON_LINKIFIED_ANCESTORS: readonly string[] = ['a', 'code', 'pre'];

export function sanitizeEmailHtml(input: string, options: SanitizeEmailHtmlOptions = {}): string {
  if (!input) return '';

  const linkifyText = options.linkifyText === true;
  const openElements: string[] = [];
  let output = '';
  let index = 0;

  const closeDownTo = (depth: number) => {
    while (openElements.length > depth) output += `</${openElements.pop()}>`;
  };

  while (index < input.length) {
    const tagStart = input.indexOf('<', index);
    const canLinkify =
      linkifyText && !openElements.some((tag) => NON_LINKIFIED_ANCESTORS.includes(tag));

    if (tagStart === -1) {
      output += renderText(input.slice(index), canLinkify);
      break;
    }
    if (tagStart > index) output += renderText(input.slice(index, tagStart), canLinkify);

    const remainder = input.slice(tagStart);

    // Comments carry Word's conditional markup and are never content.
    if (remainder.startsWith('<!--')) {
      const commentEnd = input.indexOf('-->', tagStart + 4);
      index = commentEnd === -1 ? input.length : commentEnd + 3;
      continue;
    }
    // Doctypes, CDATA, downlevel-revealed conditionals, processing instructions.
    if (remainder.startsWith('<!') || remainder.startsWith('<?')) {
      const declarationEnd = input.indexOf('>', tagStart + 2);
      index = declarationEnd === -1 ? input.length : declarationEnd + 1;
      continue;
    }

    if (remainder.startsWith('</')) {
      const closeMatch = CLOSE_TAG_PATTERN.exec(remainder);
      if (!closeMatch) {
        output += '&lt;';
        index = tagStart + 1;
        continue;
      }
      index = tagStart + closeMatch[0].length;
      const closedTag = closeMatch[1].toLowerCase();
      const openIndex = openElements.lastIndexOf(closedTag);
      if (openIndex !== -1) closeDownTo(openIndex);
      continue;
    }

    const openMatch = OPEN_TAG_PATTERN.exec(remainder);
    if (!openMatch) {
      output += '&lt;';
      index = tagStart + 1;
      continue;
    }
    index = tagStart + openMatch[0].length;

    const tag = openMatch[1].toLowerCase();
    const rawAttributes = openMatch[2];
    const selfClosing = rawAttributes.trimEnd().endsWith('/');

    if (DROPPED_EMAIL_TAGS.has(tag)) {
      if (!selfClosing && !DROPPED_VOID_EMAIL_TAGS.has(tag)) {
        index = skipElementContent(input, index, tag);
      }
      continue;
    }
    // Unknown wrappers (`html`, `body`, `o:p`, custom elements) are unwrapped so
    // the content they hold survives the paste.
    if (!ALLOWED_EMAIL_TAGS.has(tag)) continue;

    const implicitlyClosed = IMPLICITLY_CLOSED_BY[tag];
    if (implicitlyClosed) {
      while (
        openElements.length > 0 &&
        implicitlyClosed.includes(openElements[openElements.length - 1])
      ) {
        output += `</${openElements.pop()}>`;
      }
    }

    output += `<${tag}${renderAttributes(tag, rawAttributes)}>`;
    if (!VOID_EMAIL_TAGS.has(tag) && !selfClosing) openElements.push(tag);
  }

  closeDownTo(0);
  return output;
}

/**
 * Walks past a dropped element and everything it contains, counting nesting so a
 * `<svg><svg></svg></svg>` payload cannot leave half of itself behind.
 */
function skipElementContent(input: string, start: number, tag: string): number {
  const boundary = new RegExp(
    `<(/?)${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[\\s/>])`,
    'gi'
  );
  boundary.lastIndex = start;
  let depth = 1;
  let match = boundary.exec(input);

  while (match !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) {
      const tagEnd = input.indexOf('>', boundary.lastIndex);
      return tagEnd === -1 ? input.length : tagEnd + 1;
    }
    match = boundary.exec(input);
  }
  return input.length;
}

function renderAttributes(tag: string, rawAttributes: string): string {
  const rendered: string[] = [];
  const seen = new Set<string>();
  let hasSafeHref = false;

  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match = ATTRIBUTE_PATTERN.exec(rawAttributes);

  while (match !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    match = ATTRIBUTE_PATTERN.exec(rawAttributes);

    if (seen.has(name)) continue;
    seen.add(name);
    // Event handlers and namespaced URL attributes never survive, whatever the tag.
    if (name.startsWith('on') || name.includes(':')) continue;
    // Links get their own target/rel below; the pasted ones are not trusted.
    if (tag === 'a' && (name === 'target' || name === 'rel')) continue;
    if (!isAllowedEmailAttribute(tag, name)) continue;

    if (URL_EMAIL_ATTRIBUTES.has(name)) {
      if (!isSafeEmailUrl(value)) continue;
      if (name === 'href') hasSafeHref = true;
    }

    if (name === 'style') {
      const style = sanitizeInlineStyle(value);
      if (style) rendered.push(`style="${escapeAttributeValue(style)}"`);
      continue;
    }

    rendered.push(value ? `${name}="${escapeAttributeValue(value)}"` : name);
  }

  if (tag === 'a' && hasSafeHref) {
    rendered.push('target="_blank"', 'rel="noopener noreferrer"');
  }

  return rendered.length > 0 ? ` ${rendered.join(' ')}` : '';
}

function renderText(value: string, linkify: boolean): string {
  if (!linkify) return escapeText(value);

  let html = '';
  let lastIndex = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const matched = match[0];
    const matchIndex = match.index ?? 0;
    const trailing = matched.match(TRAILING_URL_PUNCTUATION_PATTERN)?.[0] ?? '';
    const url = trailing ? matched.slice(0, -trailing.length) : matched;

    html += escapeText(value.slice(lastIndex, matchIndex));
    if (url) {
      const href = url.startsWith('www.') ? `https://${url}` : url;
      html +=
        `<a href="${escapeAttributeValue(href)}" target="_blank" rel="noopener noreferrer">` +
        `${escapeText(url)}</a>`;
    }
    html += escapeText(trailing);
    lastIndex = matchIndex + matched.length;
  }

  html += escapeText(value.slice(lastIndex));
  return html;
}

export function escapeText(value: string): string {
  return value.replace(BARE_AMPERSAND_PATTERN, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttributeValue(value: string): string {
  return escapeText(value).replace(/"/g, '&quot;');
}
