import type {
  EmailSignatureOption,
  EmailSignaturePreference,
  EmailSignatures,
} from '../schemas/email-signature.schema';
import { EMAIL_SIGNATURE_CLASS } from './email-html-policy';
import { sanitizeEmailHtml } from './email-html-sanitize';
import { isEmptyEmailHtml } from './email-rich-text';

/**
 * The signature in a message being written.
 *
 * It lives in the body, like Gmail's and Outlook's: the user can edit it for
 * one message, and it is what the provider stores with the draft and sends. It
 * is wrapped in `<div class="elli-signature">` so the composer can find it
 * again — to swap it for another signature, take it out, or tell "the user has
 * written nothing" apart from "the body holds only a signature".
 *
 * Everything here returns the browser's own serialization of the markup, the
 * same the editor reads back from `innerHTML`. A body built here therefore
 * compares equal to the editor's copy of it, which is what lets an untouched
 * composer be recognised as untouched.
 *
 * Relative imports on purpose: exercised by bun tests, and bun does not
 * resolve the `@/` alias.
 */

/** Where the caret starts: an empty line above the signature, not inside it. */
const EMPTY_LINE = '<div><br></div>';

function parseBody(html: string): HTMLElement {
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
}

/**
 * The composer's signature block: the last one that is not inside a quote. A
 * message pasted in — a forwarded ElliHub email, say — can carry its sender's
 * signature, and that one is theirs, not this message's.
 */
function findSignatureBlock(body: HTMLElement): Element | null {
  const blocks = [...body.querySelectorAll(`div.${EMAIL_SIGNATURE_CLASS}`)].filter(
    (block) => !block.closest('blockquote')
  );
  return blocks.at(-1) ?? null;
}

function signatureBlock(signatureHtml: string): Element {
  const html = `<div class="${EMAIL_SIGNATURE_CLASS}">${sanitizeEmailHtml(signatureHtml)}</div>`;
  return parseBody(html).firstElementChild!;
}

/** The body with this signature in it: replacing the one there, or added at the end. */
export function withEmailSignature(bodyHtml: string, signatureHtml: string): string {
  const body = parseBody(bodyHtml);
  const block = signatureBlock(signatureHtml);
  const current = findSignatureBlock(body);

  if (current) {
    current.replaceWith(block);
  } else {
    if (isEmptyEmailHtml(bodyHtml)) body.innerHTML = EMPTY_LINE;
    body.append(block);
  }
  return body.innerHTML;
}

/** The body with the signature taken out. */
export function withoutEmailSignature(bodyHtml: string): string {
  if (!bodyHtml.includes(EMAIL_SIGNATURE_CLASS)) return bodyHtml;
  const body = parseBody(bodyHtml);
  const block = findSignatureBlock(body);
  if (!block) return bodyHtml;
  block.remove();
  return body.innerHTML;
}

/**
 * Whether the user has written anything, ignoring the signature. A reply that
 * holds only the signature added for it is still an empty reply.
 */
export function isEmptyEmailBody(bodyHtml: string): boolean {
  return isEmptyEmailHtml(withoutEmailSignature(bodyHtml));
}

/**
 * What a signature says: its text and its images. Compared instead of markup,
 * because a provider rewrites markup on a draft round-trip — Outlook reorders
 * an image's attributes and re-spaces its styles — without changing either.
 */
function fingerprint(block: Element): string {
  const text = (block.textContent ?? '').replace(/\s+/g, ' ').trim();
  const images = [...block.querySelectorAll('img')].map((image) => image.getAttribute('src'));
  return `${text}|${images.join(' ')}`;
}

/**
 * Which signature the body holds: a template's id, `null` for none, or
 * `'edited'` when there is one but it no longer matches any template — edited
 * for this message, or from a template since changed.
 */
export function findEmailSignatureId(
  bodyHtml: string,
  options: readonly Pick<EmailSignatureOption, 'id' | 'html'>[]
): string | null | 'edited' {
  if (!bodyHtml.includes(EMAIL_SIGNATURE_CLASS)) return null;
  const block = findSignatureBlock(parseBody(bodyHtml));
  if (!block) return null;

  const current = fingerprint(block);
  return (
    options.find((option) => fingerprint(signatureBlock(option.html)) === current)?.id ?? 'edited'
  );
}

/**
 * The body a composer opens with: the user's default signature under an empty
 * line, when this kind of message gets one; otherwise empty.
 */
export function getSignatureSeed(
  signatures: EmailSignatures | undefined,
  kind: 'new' | 'reply'
): string {
  if (!signatures) return '';
  const { preference, defaultSignatureId } = signatures;
  if (!(kind === 'new' ? preference.insertOnNew : preference.insertOnReply)) return '';

  const signature = signatures.signatures.find((option) => option.id === defaultSignatureId);
  return signature ? withEmailSignature('', signature.html) : '';
}

/**
 * The signatures as they will be once this preference is saved — for showing
 * the change before the server answers. The same rule elli-core applies: the
 * chosen template while it is offered, else the company default.
 */
export function applySignaturePreference(
  signatures: EmailSignatures,
  preference: EmailSignaturePreference
): EmailSignatures {
  const chosen = signatures.signatures.find((option) => option.id === preference.templateId);
  const companyDefault = signatures.signatures.find((option) => option.isCompanyDefault);
  return {
    ...signatures,
    preference,
    defaultSignatureId: (chosen ?? companyDefault)?.id ?? null,
  };
}

/**
 * A signature image elli-core attached on sending (`cid:elli-signature-<file>`),
 * pointed back at its public link. elli-core swaps the links for attachments
 * only as a message leaves; a draft whose send failed after that step comes
 * back citing attachments the editor cannot show, so on opening it the links
 * return — and are attached again when it is next sent. The Content-ID names
 * the file (every bundled signature image is named in `[a-z0-9.-]`), and
 * Outlook may add an `@…` suffix to it.
 */
const SIGNATURE_CONTENT_ID = /(["'])cid:elli-signature-([a-z0-9.-]+?)(?:@[^"'\s]*)?\1/gi;

export function linkSignatureImages(
  html: string,
  apiBase: string = import.meta.env.VITE_API_BASE_URL ?? ''
): string {
  if (!html.includes('cid:elli-signature-')) return html;
  return html.replace(
    SIGNATURE_CONTENT_ID,
    (_match, quote: string, fileName: string) =>
      `${quote}${apiBase}/api/v1/mail/signature-assets/${fileName}${quote}`
  );
}
