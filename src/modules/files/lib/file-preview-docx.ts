/**
 * Whether the preview dialog renders this file with `docx-preview`.
 *
 * Only the OOXML `.docx` format qualifies. Legacy `.doc` (`application/msword`),
 * `.rtf`, `.odt` and the presentation formats share the dialog's "document"
 * bucket but cannot be read in the browser, so they still fall back to a
 * download. A provider that sends a `.docx` attachment as
 * `application/octet-stream` is common, so the name counts as much as the type.
 */
export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface DocxCandidate {
  mimeType?: string | null;
  name?: string | null;
  displayName?: string | null;
}

function hasDocxExtension(name: string | null | undefined): boolean {
  return /\.docx$/i.test(name?.trim() ?? '');
}

export function isDocxPreviewable(item: DocxCandidate): boolean {
  const mimeType = (item.mimeType ?? '').split(';')[0]?.trim().toLowerCase();
  if (mimeType === DOCX_MIME_TYPE) return true;
  return hasDocxExtension(item.displayName) || hasDocxExtension(item.name);
}
