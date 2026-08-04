const EMAIL_BODY_STYLE = [
  'margin: 0',
  'white-space: pre-wrap',
  'overflow-wrap: anywhere',
  'word-break: break-word',
].join('; ');

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function preserveHorizontalWhitespace(line: string) {
  return line
    .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
    .replace(/(^ +| +$| {2,})/g, (spaces) => '&nbsp;'.repeat(spaces.length));
}

const URL_PATTERN = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING_URL_PUNCTUATION_PATTERN = /[),.;:!?]+$/;

function splitTrailingUrlPunctuation(value: string) {
  const trailing = value.match(TRAILING_URL_PUNCTUATION_PATTERN)?.[0] ?? '';
  if (!trailing) return { url: value, trailing: '' };
  return {
    url: value.slice(0, -trailing.length),
    trailing,
  };
}

function formatLineWithLinks(line: string) {
  let html = '';
  let lastIndex = 0;

  for (const match of line.matchAll(URL_PATTERN)) {
    const matchedValue = match[0];
    const matchIndex = match.index ?? 0;
    const { url, trailing } = splitTrailingUrlPunctuation(matchedValue);

    html += preserveHorizontalWhitespace(escapeHtml(line.slice(lastIndex, matchIndex)));
    if (url) {
      const href = url.startsWith('www.') ? `https://${url}` : url;
      html += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`;
    }
    html += escapeHtml(trailing);
    lastIndex = matchIndex + matchedValue.length;
  }

  html += preserveHorizontalWhitespace(escapeHtml(line.slice(lastIndex)));
  return html;
}

/**
 * Converts textarea text into email-safe HTML without relying on client-specific
 * paragraph margins. Explicit <br> elements provide the fallback when an email
 * client strips inline styles, while pre-wrap and non-breaking spaces preserve
 * the remaining textarea whitespace.
 */
export function plainTextToEmailHtml(value: string) {
  const normalized = value.replace(/\r\n?/g, '\n');
  const content = normalized
    .split('\n')
    .map(formatLineWithLinks)
    .join('<br>');

  return `<div style="${EMAIL_BODY_STYLE}">${content}</div>`;
}
