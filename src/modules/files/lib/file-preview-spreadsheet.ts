/**
 * Whether the preview dialog renders this file as a workbook with ExcelTS.
 *
 * Only the OOXML formats, `.xlsx` and `.xlsm`, qualify. Legacy `.xls` and
 * OpenDocument `.ods` share the dialog's "spreadsheet" bucket but ExcelTS cannot
 * read them, so they fall back to a download.
 *
 * CSV and TSV are not workbooks: the dialog reads them as text through the
 * capped text endpoint, and a delimited extension in the name wins over the
 * MIME type. Providers that send a workbook as `application/octet-stream` are
 * common, so the name counts as much as the type.
 */
const WORKBOOK_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
]);

const WORKBOOK_EXTENSIONS = new Set(['xlsx', 'xlsm']);
const DELIMITED_EXTENSIONS = new Set(['csv', 'tsv']);

interface WorkbookCandidate {
  mimeType?: string | null;
  name?: string | null;
  displayName?: string | null;
}

function extensionOf(name: string | null | undefined): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(name?.trim() ?? '');
  return match ? match[1]!.toLowerCase() : null;
}

export function isWorkbookPreviewable(item: WorkbookCandidate): boolean {
  const extensions = [extensionOf(item.displayName), extensionOf(item.name)];
  if (extensions.some((extension) => extension && DELIMITED_EXTENSIONS.has(extension))) {
    return false;
  }
  const mimeType = (item.mimeType ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  if (WORKBOOK_MIME_TYPES.has(mimeType)) return true;
  return extensions.some((extension) => extension && WORKBOOK_EXTENSIONS.has(extension));
}
