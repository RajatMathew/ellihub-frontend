import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import {
  getEmailInlineImageCid,
  getInlineEmailImageSources,
  resolveZohoInlineImageUrl,
} from '@/modules/email/lib/email-attachments';

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

  return (
    <div className="max-w-prose space-y-3 text-sm leading-6 text-foreground">
      {content.map((paragraph, index) => (
        <p key={`${index}-${paragraph}`}>{linkifyPlainText(paragraph)}</p>
      ))}
    </div>
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

function EmailHtmlBody({
  sourceHtml,
  attachments,
  inlineImageBaseUrl,
}: {
  sourceHtml: string;
  attachments: EmailAttachment[];
  inlineImageBaseUrl?: string | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    let imageCleanups: Array<() => void> = [];
    let themeObserver: MutationObserver | null = null;
    let restoreReadableColors: () => void = () => undefined;

    const frameId = window.requestAnimationFrame(() => {
      const documentHtml = sanitizeEmailDocument(sourceHtml, attachments, inlineImageBaseUrl);
      const parsedDocument = new DOMParser().parseFromString(documentHtml, 'text/html');
      const emailRoot = document.importNode(parsedDocument.documentElement, true);
      const baseStyles = document.createElement('style');
      /* eslint-disable no-restricted-syntax -- a CSS stylesheet for the
         message's shadow root, not a Tailwind class string. `!important` here is
         holding sender markup back, which is the whole point. */
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
      a[href] {
        color: ${EMAIL_LINK_COLOR};
        text-decoration: underline;
        text-underline-offset: 2px;
      }
    `;
      /* eslint-enable no-restricted-syntax */

      shadowRoot.replaceChildren(baseStyles, emailRoot);
      const images = Array.from(shadowRoot.querySelectorAll<HTMLImageElement>('img'));
      imageCleanups = images.map((image) => {
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

      restoreReadableColors = keepEmailTextReadable(shadowRoot, host);
      themeObserver = new MutationObserver(() => {
        restoreReadableColors();
        restoreReadableColors = keepEmailTextReadable(shadowRoot, host);
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      imageCleanups.forEach((cleanup) => cleanup());
      themeObserver?.disconnect();
      shadowRoot.replaceChildren();
    };
  }, [attachments, inlineImageBaseUrl, sourceHtml]);

  return <div ref={hostRef} className="w-full min-w-0 overflow-x-auto" />;
}

type RgbaColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

type OriginalTextStyles = {
  color: string;
  colorPriority: string;
  textShadow: string;
  textShadowPriority: string;
};

const MINIMUM_BODY_TEXT_CONTRAST = 4.5;
const BLACK: RgbaColor = { red: 0, green: 0, blue: 0, alpha: 1 };
const WHITE: RgbaColor = { red: 255, green: 255, blue: 255, alpha: 1 };

function keepEmailTextReadable(shadowRoot: ShadowRoot, host: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const originalStyles = new Map<HTMLElement, OriginalTextStyles>();

  if (!context) return () => undefined;

  const hostForeground = resolveCssColor(context, getComputedStyle(host).color);
  const textElements = Array.from(shadowRoot.querySelectorAll<HTMLElement>('body, body *')).filter(
    hasDirectText
  );

  for (const element of textElements) {
    const computedStyle = getComputedStyle(element);
    const textColor = resolveCssColor(context, computedStyle.color);
    const backgroundColor = getEffectiveBackground(context, element, host);
    if (!textColor || !backgroundColor) continue;

    const renderedTextColor = compositeColors(textColor, backgroundColor);
    if (getContrastRatio(renderedTextColor, backgroundColor) >= MINIMUM_BODY_TEXT_CONTRAST) {
      continue;
    }

    const readableColor = [hostForeground, BLACK, WHITE]
      .filter((color): color is RgbaColor => Boolean(color))
      .map((color) => ({
        color,
        contrast: getContrastRatio(compositeColors(color, backgroundColor), backgroundColor),
      }))
      .sort((left, right) => right.contrast - left.contrast)[0];

    if (!readableColor || readableColor.contrast < MINIMUM_BODY_TEXT_CONTRAST) continue;

    originalStyles.set(element, {
      color: element.style.getPropertyValue('color'),
      colorPriority: element.style.getPropertyPriority('color'),
      textShadow: element.style.getPropertyValue('text-shadow'),
      textShadowPriority: element.style.getPropertyPriority('text-shadow'),
    });
    element.style.setProperty('color', toCssColor(readableColor.color), 'important');
    element.style.setProperty('text-shadow', 'none', 'important');
  }

  return () => {
    for (const [element, originalStyle] of originalStyles) {
      restoreStyleProperty(element, 'color', originalStyle.color, originalStyle.colorPriority);
      restoreStyleProperty(
        element,
        'text-shadow',
        originalStyle.textShadow,
        originalStyle.textShadowPriority
      );
    }
  };
}

function hasDirectText(element: HTMLElement) {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
  );
}

function resolveCssColor(context: CanvasRenderingContext2D, cssColor: string): RgbaColor | null {
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = cssColor;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return { red, green, blue, alpha: alpha / 255 };
}

function getEffectiveBackground(
  context: CanvasRenderingContext2D,
  element: HTMLElement,
  host: HTMLElement
) {
  const backgrounds: RgbaColor[] = [];
  let current: HTMLElement | null = element;

  while (current) {
    const background = resolveCssColor(context, getComputedStyle(current).backgroundColor);
    if (background && background.alpha > 0) backgrounds.push(background);

    if (current.parentElement) {
      current = current.parentElement;
    } else if (current.getRootNode() === host.shadowRoot) {
      current = host;
    } else {
      current = null;
    }
  }

  return backgrounds
    .reverse()
    .reduce((background, foreground) => compositeColors(foreground, background), WHITE);
}

function compositeColors(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { ...BLACK, alpha: 0 };

  return {
    red:
      (foreground.red * foreground.alpha +
        background.red * background.alpha * (1 - foreground.alpha)) /
      alpha,
    green:
      (foreground.green * foreground.alpha +
        background.green * background.alpha * (1 - foreground.alpha)) /
      alpha,
    blue:
      (foreground.blue * foreground.alpha +
        background.blue * background.alpha * (1 - foreground.alpha)) /
      alpha,
    alpha,
  };
}

function getContrastRatio(left: RgbaColor, right: RgbaColor) {
  const lighter = Math.max(getRelativeLuminance(left), getRelativeLuminance(right));
  const darker = Math.min(getRelativeLuminance(left), getRelativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: RgbaColor) {
  const channels = [color.red, color.green, color.blue].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function toCssColor(color: RgbaColor) {
  return `rgb(${Math.round(color.red)} ${Math.round(color.green)} ${Math.round(color.blue)})`;
}

function restoreStyleProperty(
  element: HTMLElement,
  property: string,
  value: string,
  priority: string
) {
  if (value) {
    element.style.setProperty(property, value, priority);
  } else {
    element.style.removeProperty(property);
  }
}

function sanitizeEmailDocument(
  value: string,
  attachments: EmailAttachment[],
  inlineImageBaseUrl?: string | null
) {
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
    link.style.setProperty('color', EMAIL_LINK_COLOR);
    link.style.setProperty('text-decoration', 'underline');
    link.style.setProperty('text-underline-offset', '2px');
  });

  linkifyTextNodes(document);

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
        element.removeAttribute('src');
        element.removeAttribute('srcset');
        element.setAttribute('data-missing-inline-image', cid);
      }
    });

  return document.documentElement.outerHTML;
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
