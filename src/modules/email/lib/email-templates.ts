import { EMAIL_SIGNATURE_CLASS } from './email-html-policy';
import { sanitizeEmailHtml } from './email-html-sanitize';
import { isEmptyEmailBody } from './email-signature';

/**
 * Email templates in the composer (elli-ui#668): replies someone writes often,
 * dropped into the body with a click. Pure, so they are tested without the
 * popover. Relative imports, as in `email-signature.ts`, for the bun tests.
 */

export type EmailTemplateItem = {
  id: string;
  name: string;
  subject: string | null;
  body: string;
};

const EMPTY_LINE = '<div><br></div>';

function parseBody(html: string): HTMLElement {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
}

/** The composer's signature block: the last one not inside a quote. */
function signatureBlock(body: HTMLElement): Element | null {
  const blocks = [...body.querySelectorAll(`div.${EMAIL_SIGNATURE_CLASS}`)].filter(
    (block) => !block.closest('blockquote')
  );
  return blocks.at(-1) ?? null;
}

/**
 * The body with a template in it, above the signature. Nothing typed yet, and
 * the template takes the empty lines' place; something typed, and it follows
 * it. Sanitized the way a signature is, since it lands in the editor as HTML.
 */
export function insertEmailTemplate(bodyHtml: string, templateHtml: string): string {
  const template = sanitizeEmailHtml(templateHtml);
  const body = parseBody(bodyHtml);
  const signature = signatureBlock(body);

  if (isEmptyEmailBody(bodyHtml)) {
    const kept = signature ? `${EMPTY_LINE}${signature.outerHTML}` : '';
    return `${template}${kept}`;
  }

  const fragment = parseBody(`${template}`);
  const nodes = [...fragment.childNodes];
  if (signature) {
    signature.before(...nodes, parseBody(EMPTY_LINE).firstChild!);
  } else {
    body.append(...nodes);
  }
  return body.innerHTML;
}

/** A template's first words, for the list: plain text, on one line. */
export function templatePreview(bodyHtml: string, maxLength = 90): string {
  // A space where a block or line ends, so "<p>Hi,</p><p>Any update?</p>"
  // reads "Hi, Any update?" rather than running the paragraphs together.
  const spaced = bodyHtml.replace(/<\/(p|div|li|h[1-6]|blockquote)>|<br\s*\/?>/gi, '$& ');
  const text = (parseBody(spaced).textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

/** Templates whose name or words match what was typed in the search. */
export function filterTemplates<T extends EmailTemplateItem>(
  templates: readonly T[],
  query: string
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...templates];
  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(needle) ||
      templatePreview(template.body, Number.POSITIVE_INFINITY).toLowerCase().includes(needle)
  );
}
