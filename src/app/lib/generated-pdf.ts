export type GeneratedPdfFile = {
  blob: Blob;
  fileName: string;
  contentType: string;
};

const DOWNLOAD_INVALID_CHARS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

export function sanitizeDownloadName(value: string): string {
  return (
    Array.from(value)
      .map((character) =>
        DOWNLOAD_INVALID_CHARS.has(character) || character.charCodeAt(0) < 32 ? '_' : character
      )
      .join('')
      .replace(/\s+/g, ' ')
      .trim() || 'document.pdf'
  );
}

export function getPdfDownloadName(disposition: string, fallback: string): string {
  const encodedMatch = /filename\*=UTF-8''([^;]+)/.exec(disposition);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const plainMatch = /filename="([^"]+)"/.exec(disposition);
  return plainMatch?.[1] || fallback;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
}

export function downloadGeneratedPdf(file: GeneratedPdfFile): void {
  downloadBlob(file.blob, file.fileName);
}
