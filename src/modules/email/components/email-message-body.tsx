import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import {
  getEmailInlineImageCid,
  getInlineEmailImageSources,
  loadInlineEmailImageData,
  resolveZohoInlineImageUrl,
} from '@/modules/email/lib/email-attachments';
import {
  buildEmailFrameDocument,
  EMAIL_FRAME_SANDBOX,
  EMAIL_IFRAME_HEIGHT_MESSAGE,
  sanitizeEmailHtml,
} from '@/modules/email/lib/email-html-document';
import {
  markQuotedEmailContent,
  splitQuotedPlainText,
} from '@/modules/email/lib/email-quoted-content';

type EmailMessageBodyProps = {
  body: string[];
  attachments?: EmailAttachment[];
  inlineImageBaseUrl?: string | null;
};

export function EmailMessageBody({
  body,
  attachments = [],
  inlineImageBaseUrl,
}: EmailMessageBodyProps) {
  const content = body.filter(Boolean);
  const html = content.some(looksLikeHtml) ? content.join('\n') : null;

  if (html) {
    return (
      <EmailHtmlBody
        sourceHtml={html}
        attachments={attachments}
        inlineImageBaseUrl={inlineImageBaseUrl}
      />
    );
  }

  return <EmailPlainTextBody content={content} />;
}

/**
 * Plain-text bodies quote with `>` prefixes rather than markup, so the trimmed
 * run is found by line and revealed by the same toggle the HTML path uses.
 * Lines are split out of the body here (rather than rendered as one block) —
 * without that there is nothing to detect a quote boundary against.
 */
function EmailPlainTextBody({ content }: { content: string[] }) {
  const lines = useMemo(() => content.flatMap((value) => value.split(/\r?\n/)), [content]);
  const { visible, quoted } = useMemo(() => splitQuotedPlainText(lines), [lines]);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-prose space-y-3 px-4 py-4 text-sm leading-6 text-foreground">
      {visible.map(renderPlainTextLine)}
      {quoted.length > 0 && (
        <>
          <QuotedContentToggle
            expanded={expanded}
            onToggle={() => setExpanded((current) => !current)}
          />
          {expanded && (
            <div className="space-y-3 border-l-2 border-border pl-3 text-muted-foreground">
              {quoted.map(renderPlainTextLine)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function renderPlainTextLine(line: string, index: number) {
  if (!line.trim()) return null;
  return <p key={`${index}-${line}`}>{linkifyPlainText(line)}</p>;
}

/** The React twin of the button `markQuotedEmailContent` builds for the frame. */
function QuotedContentToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const label = expanded ? 'Hide trimmed content' : 'Show trimmed content';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={label}
      title={label}
      className="flex h-5 items-center gap-0.5 rounded-full bg-muted px-2 text-muted-foreground transition-colors hover:bg-accent"
    >
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="size-1 rounded-full bg-current" aria-hidden="true" />
      ))}
    </button>
  );
}

const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_URL_PUNCTUATION_PATTERN = /[),.;:!?]+$/;
const EMAIL_LINK_COLOR = '#2563eb';

function splitTrailingUrlPunctuation(value: string) {
  const trailing = value.match(TRAILING_URL_PUNCTUATION_PATTERN)?.[0] ?? '';
  if (!trailing) return { url: value, trailing: '' };
  return {
    url: value.slice(0, -trailing.length),
    trailing,
  };
}

function getLinkHref(url: string) {
  return url.startsWith('www.') ? `https://${url}` : url;
}

function linkifyPlainText(value: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const matchedValue = match[0];
    const matchIndex = match.index ?? 0;
    const { url, trailing } = splitTrailingUrlPunctuation(matchedValue);

    if (matchIndex > lastIndex) nodes.push(value.slice(lastIndex, matchIndex));
    if (url) {
      nodes.push(
        <a
          key={`${matchIndex}-${url}`}
          href={getLinkHref(url)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
        >
          {url}
        </a>
      );
    }
    if (trailing) nodes.push(trailing);
    lastIndex = matchIndex + matchedValue.length;
  }

  if (lastIndex < value.length) nodes.push(value.slice(lastIndex));
  return nodes.length > 0 ? nodes : value;
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/**
 * Renders a message body in a sandboxed frame.
 *
 * The frame cannot be measured from here — it has no `allow-same-origin`, by
 * design — so it reports its own height by `postMessage` and this component
 * sizes the element to match. See `email-html-document.ts` for why the
 * isolation is shaped that way.
 */
function EmailHtmlBody({
  sourceHtml,
  attachments,
  inlineImageBaseUrl,
}: {
  sourceHtml: string;
  attachments: EmailAttachment[];
  inlineImageBaseUrl?: string | null;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Starts at roughly one line and grows to whatever the frame reports. Starting
  // tall instead makes every short message visibly collapse on first paint.
  const [height, setHeight] = useState(24);

  // Keyed by content, not by array identity. Callers write
  // `message.attachments ?? []`, so a message without attachments hands us a
  // new array on every render — and reassigning `srcdoc` reloads the frame,
  // which would visibly flash the message on any unrelated re-render.
  const attachmentKey = attachments
    .map((attachment) => `${attachment.id}:${attachment.contentId ?? ''}`)
    .join('|');
  const stableAttachments = useMemo(
    () => attachments,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the real dependency
    [attachmentKey]
  );

  // Built asynchronously because inline images are fetched here rather than by
  // the frame — see `loadInlineEmailImageData`. The body without them is
  // rendered first so text is never gated on an image request.
  const [frameDocument, setFrameDocument] = useState(() =>
    buildEmailFrameDocument({
      bodyHtml: prepareEmailBody(sourceHtml, stableAttachments, inlineImageBaseUrl),
      apiOrigin: getApiOrigin(),
    })
  );

  useEffect(() => {
    const controller = new AbortController();

    const build = async (inlineImages?: ReadonlyMap<string, string>) =>
      buildEmailFrameDocument({
        bodyHtml: prepareEmailBody(sourceHtml, stableAttachments, inlineImageBaseUrl, inlineImages),
        apiOrigin: getApiOrigin(),
      });

    void (async () => {
      setFrameDocument(await build());
      const sources = getInlineEmailImageSources(
        stableAttachments,
        import.meta.env.VITE_API_BASE_URL
      );
      if (sources.size === 0) return;

      const inlineImages = await loadInlineEmailImageData(sources, controller.signal);
      if (controller.signal.aborted || inlineImages.size === 0) return;
      setFrameDocument(await build(inlineImages));
    })();

    return () => controller.abort();
  }, [stableAttachments, inlineImageBaseUrl, sourceHtml]);

  const handleMessage = useCallback((event: MessageEvent) => {
    // Only this frame's own reports: the message channel is shared with every
    // other message rendered on the page.
    if (event.source !== frameRef.current?.contentWindow) return;
    const data = event.data as Record<string, unknown> | null;
    if (!data || typeof data !== 'object' || data[EMAIL_IFRAME_HEIGHT_MESSAGE] !== true) return;
    const reported = data.height;
    if (typeof reported === 'number' && reported > 0) setHeight(Math.ceil(reported));
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  return (
    <iframe
      ref={frameRef}
      srcDoc={frameDocument}
      sandbox={EMAIL_FRAME_SANDBOX}
      title="Message content"
      className="block w-full border-0 bg-white"
      style={{ height: `${height}px` }}
    />
  );
}

function getApiOrigin(): string | null {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return null;
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return null;
  }
}

/**
 * Sanitize, then apply our own transformations: inline images resolved to API
 * URLs, bare URLs linkified, quoted history marked.
 *
 * Order matters. Sanitizing first means everything after it operates on trusted
 * markup, and the nodes we add — the quote toggle in particular, a `<button>`,
 * which the sanitizer strips as a phishing vector — are never fed back through
 * it.
 */
function prepareEmailBody(
  value: string,
  attachments: EmailAttachment[],
  inlineImageBaseUrl?: string | null,
  inlineImages?: ReadonlyMap<string, string>
): string {
  if (typeof window === 'undefined') return '';

  const clean = sanitizeEmailHtml(value);
  // Explicit `<body>` keeps the parser in "in body" mode: a fragment that opens
  // with `<style>` — which most marketing mail does — is otherwise hoisted into
  // `<head>` and lost when the body is serialized back out.
  const document = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html');

  resolveInlineImages(document, attachments, inlineImageBaseUrl, inlineImages);
  applyLinkAttributes(document);
  linkifyTextNodes(document);
  markQuotedEmailContent(document);

  return document.body.innerHTML;
}

function applyLinkAttributes(document: Document) {
  document.body.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

function resolveInlineImages(
  document: Document,
  attachments: EmailAttachment[],
  inlineImageBaseUrl?: string | null,
  inlineImages?: ReadonlyMap<string, string>
) {
  // Prefer the fetched `data:` URI; the API URL is only a fallback for the
  // first render, before the bytes have arrived.
  const inlineImageSources =
    inlineImages && inlineImages.size > 0
      ? inlineImages
      : getInlineEmailImageSources(attachments, import.meta.env.VITE_API_BASE_URL);

  document.body
    .querySelectorAll<HTMLImageElement | HTMLSourceElement>('img, source')
    .forEach((element) => {
      const zohoSource = [
        element.getAttribute('src'),
        element.getAttribute('originalsrc'),
        element.getAttribute('data-originalsrc'),
        element.getAttribute('data-original-src'),
      ]
        .map((source) => resolveZohoInlineImageUrl(source, inlineImageBaseUrl))
        .find(Boolean);
      if (zohoSource) {
        if (element instanceof HTMLSourceElement) {
          element.setAttribute('srcset', zohoSource);
          element.removeAttribute('src');
        } else {
          element.setAttribute('src', zohoSource);
          element.removeAttribute('srcset');
        }
        element.setAttribute('referrerpolicy', 'no-referrer');
        return;
      }

      const cid = getEmailInlineImageCid({
        src: element.getAttribute('src'),
        srcset: element.getAttribute('srcset'),
        originalSrc: element.getAttribute('originalsrc'),
        dataOriginalSrc:
          element.getAttribute('data-originalsrc') ?? element.getAttribute('data-original-src'),
      });
      if (!cid) return;

      const contentUrl = inlineImageSources.get(cid);
      if (contentUrl) {
        if (element instanceof HTMLSourceElement) {
          element.setAttribute('srcset', contentUrl);
          element.removeAttribute('src');
        } else {
          element.setAttribute('src', contentUrl);
          element.removeAttribute('srcset');
        }
      } else {
        // A `cid:` reference with no matching attachment would draw a broken
        // image; drop the source so nothing is rendered for it.
        element.removeAttribute('src');
        element.removeAttribute('srcset');
        element.setAttribute('data-missing-inline-image', cid);
      }
    });
}

function linkifyTextNodes(document: Document) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || !URL_PATTERN.test(node.textContent)) {
        URL_PATTERN.lastIndex = 0;
        return NodeFilter.FILTER_REJECT;
      }
      URL_PATTERN.lastIndex = 0;

      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('a, style, script, code, pre')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  for (const textNode of textNodes) {
    const fragment = document.createDocumentFragment();
    const value = textNode.textContent ?? '';
    let lastIndex = 0;

    for (const match of value.matchAll(URL_PATTERN)) {
      const matchedValue = match[0];
      const matchIndex = match.index ?? 0;
      const { url, trailing } = splitTrailingUrlPunctuation(matchedValue);

      if (matchIndex > lastIndex) {
        fragment.append(document.createTextNode(value.slice(lastIndex, matchIndex)));
      }
      if (url) {
        const link = document.createElement('a');
        link.href = getLinkHref(url);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = url;
        link.style.setProperty('color', EMAIL_LINK_COLOR);
        link.style.setProperty('text-decoration', 'underline');
        link.style.setProperty('text-underline-offset', '2px');
        fragment.append(link);
      }
      if (trailing) fragment.append(document.createTextNode(trailing));
      lastIndex = matchIndex + matchedValue.length;
    }

    if (lastIndex < value.length) {
      fragment.append(document.createTextNode(value.slice(lastIndex)));
    }
    textNode.replaceWith(fragment);
  }
}
