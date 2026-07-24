import { useEffect, useRef } from 'react';

import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import {
  getEmailInlineImageCid,
  getInlineEmailImageSources,
} from '@/modules/email/lib/email-attachments';

type EmailMessageBodyProps = {
  body: string[];
  attachments?: EmailAttachment[];
};

export function EmailMessageBody({ body, attachments = [] }: EmailMessageBodyProps) {
  const content = body.filter(Boolean);
  const html = content.some(looksLikeHtml) ? content.join('\n') : null;
  const emailDocument = html ? sanitizeEmailDocument(html, attachments) : '';

  if (html) {
    return <EmailHtmlBody documentHtml={emailDocument} />;
  }

  return (
    <div className="max-w-prose space-y-3 text-sm leading-6 text-foreground">
      {content.map((paragraph, index) => (
        <p key={`${index}-${paragraph}`}>{paragraph}</p>
      ))}
    </div>
  );
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function EmailHtmlBody({ documentHtml }: { documentHtml: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const parsedDocument = new DOMParser().parseFromString(documentHtml, 'text/html');
    const emailRoot = document.importNode(parsedDocument.documentElement, true);
    const baseStyles = document.createElement('style');
    baseStyles.textContent = `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
        color: inherit;
        font: inherit;
        isolation: isolate;
        contain: layout paint;
      }
      html,
      body {
        min-width: 0;
        max-width: 100%;
        margin: 0;
        padding: 0;
        color: inherit;
        font: inherit;
      }
      img[data-email-image-hidden="true"] {
        display: none !important;
      }
      [data-email-image-fallback] {
        display: inline-block;
        max-width: 100%;
        color: inherit;
        font: inherit;
        opacity: 0.65;
      }
    `;

    shadowRoot.replaceChildren(baseStyles, emailRoot);
    const images = Array.from(shadowRoot.querySelectorAll<HTMLImageElement>('img'));
    const cleanups = images.map((image) => {
      const showFallback = () => {
        if (image.dataset.emailImageHidden === 'true') return;
        image.dataset.emailImageHidden = 'true';
        image.setAttribute('aria-hidden', 'true');

        const label = image.alt.trim();
        if (!label) return;

        const fallback = document.createElement('span');
        fallback.dataset.emailImageFallback = 'true';
        fallback.textContent = `[Image unavailable: ${label}]`;
        image.after(fallback);
      };

      image.addEventListener('error', showFallback);
      if (image.dataset.missingInlineImage || (image.complete && image.naturalWidth === 0)) {
        showFallback();
      }
      return () => image.removeEventListener('error', showFallback);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      shadowRoot.replaceChildren();
    };
  }, [documentHtml]);

  return <div ref={hostRef} className="w-full min-w-0 overflow-x-auto" />;
}

function sanitizeEmailDocument(value: string, attachments: EmailAttachment[]) {
  if (typeof window === 'undefined') return value;

  const document = new DOMParser().parseFromString(value, 'text/html');
  const inlineImageSources = getInlineEmailImageSources(
    attachments,
    import.meta.env.VITE_API_BASE_URL
  );
  document
    .querySelectorAll(
      'script, iframe, object, embed, link, base, form, input, button, textarea, select, meta[http-equiv]'
    )
    .forEach((node) => node.remove());

  document.body.querySelectorAll<HTMLElement>('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const rawValue = attribute.value.trim();
      const normalizedValue = rawValue.replace(/\s+/g, '').toLowerCase();

      if (name.startsWith('on')) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (
        (name === 'href' || name === 'src' || name === 'xlink:href') &&
        (normalizedValue.startsWith('javascript:') || normalizedValue.startsWith('data:text/html'))
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  document.body.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });

  document.body
    .querySelectorAll<HTMLImageElement | HTMLSourceElement>('img, source')
    .forEach((element) => {
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
        element.removeAttribute('src');
        element.removeAttribute('srcset');
        element.setAttribute('data-missing-inline-image', cid);
      }
    });

  return document.documentElement.outerHTML;
}
