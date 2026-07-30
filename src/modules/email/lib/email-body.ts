export function hasVisibleEmailBodyContent(body: readonly string[]): boolean {
  return body.some((content) => {
    const trimmed = content.trim();
    if (!trimmed) return false;
    if (!looksLikeHtml(trimmed)) return true;

    const parsedDocument = new DOMParser().parseFromString(trimmed, 'text/html');
    const visibleText = parsedDocument.body.textContent
      ?.replace(/[\u00a0\u200b-\u200d\ufeff]/g, '')
      .trim();
    const visibleMedia = parsedDocument.body.querySelector(
      'img, audio, video, iframe, svg, canvas'
    );

    return Boolean(visibleText || visibleMedia);
  });
}

function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
