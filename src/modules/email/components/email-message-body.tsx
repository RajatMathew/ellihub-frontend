type EmailMessageBodyProps = {
  body: string[];
};

export function EmailMessageBody({ body }: EmailMessageBodyProps) {
  const content = body.filter(Boolean);
  const html = content.some(looksLikeHtml) ? content.join('\n') : null;
  const sanitizedHtml = html ? sanitizeEmailHtml(html) : '';

  if (html) {
    return (
      <div
        className="email-message-html w-full max-w-none overflow-hidden break-words text-sm leading-6 text-foreground [&>*]:!max-w-full [&_a]:break-words [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_div]:!max-w-full [&_img]:h-auto [&_img]:max-w-full [&_p]:mb-3 [&_table]:max-w-full [&_table]:border-collapse [&_td]:!max-w-full"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
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

function sanitizeEmailHtml(value: string) {
  if (typeof window === 'undefined') return value;

  const document = new DOMParser().parseFromString(value, 'text/html');
  document
    .querySelectorAll(
      'script, style, iframe, object, embed, link, meta, base, form, input, button, textarea, select'
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

    normalizeEmailElement(element);
  });

  return document.body.innerHTML;
}

function normalizeEmailElement(element: HTMLElement) {
  element.style.maxWidth = '100%';
  element.style.boxSizing = 'border-box';

  if (element.tagName === 'TABLE') {
    element.style.width = '100%';
    element.style.tableLayout = 'auto';
  }

  if (element.tagName === 'IMG') {
    element.style.height = 'auto';
    element.style.maxWidth = '100%';
  }

  const fontSize = getFontSizeInPixels(element.style.fontSize);
  if (!fontSize) return;

  const tagName = element.tagName.toLowerCase();
  const maxFontSize = ['h1', 'h2', 'h3'].includes(tagName) ? 34 : 18;

  if (fontSize > maxFontSize) {
    element.style.fontSize = `${maxFontSize}px`;
    element.style.lineHeight = tagName === 'h1' ? '1.15' : '1.35';
  }
}

function getFontSizeInPixels(value: string) {
  const match = value.trim().match(/^([\d.]+)(px|pt|rem|em)$/i);
  if (!match) return null;

  const size = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (!Number.isFinite(size)) return null;
  if (unit === 'px') return size;
  if (unit === 'pt') return size * 1.333;
  return size * 16;
}
