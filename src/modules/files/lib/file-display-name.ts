import type { FileItem } from '@/modules/files/schemas/file.schema';

const KNOWN_FILE_EXTENSIONS = new Set([
  '7z',
  'csv',
  'doc',
  'docx',
  'dwg',
  'dxf',
  'gif',
  'heic',
  'heif',
  'ifc',
  'jpeg',
  'jpg',
  'm4a',
  'm4v',
  'mov',
  'mp3',
  'mp4',
  'mpp',
  'nwc',
  'nwd',
  'pdf',
  'png',
  'ppt',
  'pptx',
  'rfa',
  'rtf',
  'rvt',
  'skp',
  'tif',
  'tiff',
  'txt',
  'wav',
  'webm',
  'webp',
  'xls',
  'xlsm',
  'xlsx',
  'xml',
  'zip',
]);

function getKnownExtensionFromName(name: string | null | undefined): string | null {
  if (!name) return null;

  const dotIndex = name.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex >= name.length - 1) return null;

  const extension = name.slice(dotIndex + 1).toLowerCase();
  return KNOWN_FILE_EXTENSIONS.has(extension) ? extension : null;
}

function getExtensionFromMimeType(mimeType: string | null | undefined): string | null {
  if (!mimeType) return null;

  const mimeToExtension: Record<string, string> = {
    'application/msword': 'doc',
    'application/pdf': 'pdf',
    'application/rtf': 'rtf',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.ms-project': 'mpp',
    'application/vnd.ms-excel.sheet.macroenabled.12': 'xlsm',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/x-7z-compressed': '7z',
    'application/x-zip-compressed': 'zip',
    'application/zip': 'zip',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/jpeg': 'jpg',
    'image/pjpeg': 'jpg',
    'image/png': 'png',
    'image/tiff': 'tif',
    'image/vnd.dwg': 'dwg',
    'image/vnd.dxf': 'dxf',
    'image/webp': 'webp',
    'text/csv': 'csv',
    'text/plain': 'txt',
    'text/xml': 'xml',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };

  return mimeToExtension[mimeType.toLowerCase()] ?? null;
}

export function getFileDisplayNameWithExtension(file: Partial<FileItem> | null | undefined) {
  const displayName = file?.displayName || file?.name || 'Unnamed';
  if (getKnownExtensionFromName(displayName)) return displayName;

  const extension =
    getKnownExtensionFromName(file?.name) ??
    getKnownExtensionFromName(file?.objectId) ??
    getExtensionFromMimeType(file?.mimeType);

  return extension ? `${displayName}.${extension}` : displayName;
}
