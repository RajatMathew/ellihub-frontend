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
    .map((line) => preserveHorizontalWhitespace(escapeHtml(line)))
    .join('<br>');

  return `<div style="${EMAIL_BODY_STYLE}">${content}</div>`;
}
