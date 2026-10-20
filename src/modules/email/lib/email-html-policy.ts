/**
 * Allowlists for HTML that arrives from a clipboard (any email client, any web
 * page) and later leaves as a sent message. The goal is the opposite of the
 * reading-pane sanitizer: keep every structural and presentational construct a
 * sender cared about — lists, tables, alignment, inline styles — while removing
 * everything that can execute, navigate, or reach out to a remote host.
 */

/** Elements kept as-is. Anything absent is unwrapped, keeping its children. */
export const ALLOWED_EMAIL_TAGS: ReadonlySet<string> = new Set([
  'a',
  'abbr',
  'address',
  'b',
  'bdi',
  'bdo',
  'big',
  'blockquote',
  'br',
  'caption',
  'center',
  'cite',
  'code',
  'col',
  'colgroup',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'font',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'ins',
  'kbd',
  'li',
  'mark',
  'ol',
  'p',
  'pre',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strike',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'time',
  'tr',
  'tt',
  'u',
  'ul',
  'var',
  'wbr',
]);

/** Elements with no closing tag — never pushed onto the open-element stack. */
export const VOID_EMAIL_TAGS: ReadonlySet<string> = new Set(['br', 'col', 'hr', 'img', 'wbr']);

/**
 * Elements dropped together with everything inside them. Unwrapping these would
 * spill script source, CSS, or form labels into the message as visible text —
 * and `svg`/`math`/`template` are the classic mutation-XSS carriers.
 */
export const DROPPED_EMAIL_TAGS: ReadonlySet<string> = new Set([
  'applet',
  'area',
  'audio',
  'base',
  'button',
  'canvas',
  'datalist',
  'dialog',
  'embed',
  'frame',
  'frameset',
  'head',
  'iframe',
  'input',
  'link',
  'listing',
  'map',
  'marquee',
  'math',
  'meta',
  'noembed',
  'noframes',
  'noscript',
  'object',
  'optgroup',
  'option',
  'output',
  'param',
  'plaintext',
  'portal',
  'script',
  'select',
  'slot',
  'source',
  'style',
  'svg',
  'template',
  'textarea',
  'title',
  'track',
  'video',
  'xmp',
]);

/** Dropped elements that carry no content, so there is nothing to skip past. */
export const DROPPED_VOID_EMAIL_TAGS: ReadonlySet<string> = new Set([
  'area',
  'base',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
]);

/**
 * Elements a browser closes implicitly when a sibling opens. Mirroring the rule
 * keeps the serialized tree shaped the way the pasted markup rendered instead of
 * nesting paragraphs and cells inside each other.
 */
export const IMPLICITLY_CLOSED_BY: Readonly<Record<string, readonly string[]>> = {
  dd: ['dt', 'dd'],
  dt: ['dt', 'dd'],
  li: ['li'],
  p: ['p'],
  td: ['td', 'th'],
  th: ['td', 'th'],
  tr: ['td', 'th', 'tr'],
};

const GLOBAL_ATTRIBUTES: readonly string[] = ['align', 'dir', 'lang', 'style', 'title', 'valign'];

const TAG_ATTRIBUTES: Readonly<Record<string, readonly string[]>> = {
  a: ['href', 'target', 'rel'],
  col: ['span', 'width'],
  colgroup: ['span', 'width'],
  font: ['color', 'face', 'size'],
  hr: ['noshade', 'size', 'width'],
  img: ['alt', 'border', 'height', 'hspace', 'src', 'vspace', 'width'],
  li: ['type', 'value'],
  ol: ['reversed', 'start', 'type'],
  table: ['bgcolor', 'border', 'cellpadding', 'cellspacing', 'height', 'summary', 'width'],
  tbody: ['bgcolor'],
  td: ['bgcolor', 'colspan', 'height', 'nowrap', 'rowspan', 'scope', 'width'],
  tfoot: ['bgcolor'],
  th: ['bgcolor', 'colspan', 'height', 'nowrap', 'rowspan', 'scope', 'width'],
  thead: ['bgcolor'],
  tr: ['bgcolor', 'height'],
  ul: ['type'],
};

/**
 * The one class a composed message keeps: the marker on the signature block,
 * which is how the composer finds the signature again to swap or remove it —
 * after a draft round-trip through the provider too. Every other class is
 * dropped: pasted classes would pick up the app's own stylesheet in the editor.
 */
export const EMAIL_SIGNATURE_CLASS = 'elli-signature';

/** Outlook prefixes class names with `x_` in the mail it shows. */
const SIGNATURE_CLASS_PATTERN = /^(?:x_)?elli-signature$/i;

/** The `class` a pasted element may keep, or null to drop the attribute. */
export function sanitizeEmailClass(tag: string, value: string): string | null {
  if (tag !== 'div') return null;
  return value.split(/\s+/).some((token) => SIGNATURE_CLASS_PATTERN.test(token))
    ? EMAIL_SIGNATURE_CLASS
    : null;
}

export function isAllowedEmailAttribute(tag: string, attribute: string): boolean {
  if (GLOBAL_ATTRIBUTES.includes(attribute)) return true;
  return (TAG_ATTRIBUTES[tag] ?? []).includes(attribute);
}

/** Attributes whose value is a URL and therefore has to clear the scheme check. */
export const URL_EMAIL_ATTRIBUTES: ReadonlySet<string> = new Set(['href', 'src']);

const SAFE_URL_SCHEMES: ReadonlySet<string> = new Set([
  'cid:',
  'http:',
  'https:',
  'mailto:',
  'tel:',
]);

const SAFE_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|gif|webp|bmp|x-icon|vnd\.microsoft\.icon);/;

/**
 * Entities and control characters are how `javascript&#58;alert(1)` sneaks past a
 * naive prefix test, so both are removed before the scheme is read.
 */
function normalizeUrlForInspection(value: string): string {
  let stripped = '';
  for (const character of decodeBasicEntities(value)) {
    const code = character.codePointAt(0) ?? 0;
    // Control characters, spaces and line separators are ignored by URL parsers,
    // so they are ignored here too rather than hiding a scheme from the check.
    const isInsignificant =
      code <= 0x20 || code === 0x7f || code === 0xa0 || code === 0x2028 || code === 0x2029;
    if (!isInsignificant) stripped += character;
  }
  return stripped.toLowerCase();
}

export function isSafeEmailUrl(value: string): boolean {
  const normalized = normalizeUrlForInspection(value);
  if (!normalized) return false;

  const schemeMatch = /^([a-z][a-z0-9+.-]*:)/.exec(normalized);
  // No scheme at all is a relative reference — it cannot execute anything.
  if (!schemeMatch) return !normalized.startsWith('//');
  const scheme = schemeMatch[1];
  if (scheme === 'data:') return SAFE_DATA_URL_PATTERN.test(normalized);
  return SAFE_URL_SCHEMES.has(scheme);
}

const NUMERIC_ENTITY_PATTERN = /&#(x[0-9a-f]+|[0-9]+);?/gi;
const NAMED_ENTITY_VALUES: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  colon: ':',
  gt: '>',
  lt: '<',
  newline: '\n',
  quot: '"',
  sol: '/',
  tab: '\t',
};

export function decodeBasicEntities(value: string): string {
  return value
    .replace(NUMERIC_ENTITY_PATTERN, (_match, code: string) => {
      const codePoint =
        code[0].toLowerCase() === 'x'
          ? Number.parseInt(code.slice(1), 16)
          : Number.parseInt(code, 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return '';
      return String.fromCodePoint(codePoint);
    })
    .replace(
      /&([a-z]+);?/gi,
      (match, name: string) => NAMED_ENTITY_VALUES[name.toLowerCase()] ?? match
    );
}

const ALLOWED_STYLE_PREFIXES: readonly string[] = [
  'background-color',
  'border',
  'font',
  'list-style',
  'margin',
  'padding',
  'text',
];

const ALLOWED_STYLE_PROPERTIES: ReadonlySet<string> = new Set([
  'box-sizing',
  'caption-side',
  'clear',
  'color',
  'direction',
  'display',
  'empty-cells',
  'float',
  'height',
  'letter-spacing',
  'line-height',
  'max-height',
  'max-width',
  'min-height',
  'min-width',
  'opacity',
  'overflow-wrap',
  'page-break-after',
  'page-break-before',
  'page-break-inside',
  'table-layout',
  'unicode-bidi',
  'vertical-align',
  'white-space',
  'width',
  'word-break',
  'word-spacing',
  'word-wrap',
]);

/** Properties that either load a remote asset or lift content out of the flow. */
const DENIED_STYLE_PROPERTIES: ReadonlySet<string> = new Set([
  'background-image',
  'behavior',
  'border-image',
  'border-image-source',
  'list-style-image',
  'position',
  'z-index',
]);

const UNSAFE_STYLE_VALUE_PATTERN =
  /url\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:|@import|behavio(u)?r|-moz-binding|<|\\/i;

function isAllowedStyleProperty(property: string): boolean {
  if (property.startsWith('-') || DENIED_STYLE_PROPERTIES.has(property)) return false;
  if (ALLOWED_STYLE_PROPERTIES.has(property)) return true;
  return ALLOWED_STYLE_PREFIXES.some(
    (prefix) => property === prefix || property.startsWith(`${prefix}-`)
  );
}

/**
 * Rebuilds a style attribute from the declarations that survive the allowlist.
 * Returning an empty string means the attribute should be dropped entirely.
 */
export function sanitizeInlineStyle(value: string): string {
  const declarations: string[] = [];

  for (const rawDeclaration of value.split(';')) {
    const separatorIndex = rawDeclaration.indexOf(':');
    if (separatorIndex === -1) continue;

    const property = rawDeclaration.slice(0, separatorIndex).trim().toLowerCase();
    const declarationValue = rawDeclaration.slice(separatorIndex + 1).trim();
    if (!property || !declarationValue || declarationValue.length > 200) continue;
    if (!isAllowedStyleProperty(property)) continue;
    if (UNSAFE_STYLE_VALUE_PATTERN.test(decodeBasicEntities(declarationValue))) continue;

    declarations.push(`${property}: ${declarationValue.replace(/!\s*important/gi, '').trim()}`);
  }

  return declarations.join('; ');
}
