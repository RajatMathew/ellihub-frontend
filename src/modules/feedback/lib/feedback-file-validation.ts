export const FEEDBACK_MAX_FILES = 5;
export const FEEDBACK_MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;
export const FEEDBACK_FILE_ACCEPT = '*/*';

const BLOCKED_ATTACHMENT_EXTENSIONS = new Set([
  'app',
  'bat',
  'cmd',
  'com',
  'dmg',
  'exe',
  'js',
  'jse',
  'msi',
  'ps1',
  'scr',
  'sh',
  'vbs',
]);

function getBlockedExtensionFromName(fileName: string): string | undefined {
  return fileName
    .toLowerCase()
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .find((segment) => BLOCKED_ATTACHMENT_EXTENSIONS.has(segment));
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);
    if (charCode <= 0x1f || charCode === 0x7f) return true;
  }

  return false;
}

export function formatFeedbackFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const size = bytes / 1024 ** index;

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function getFeedbackFileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf('.');

  return dotIndex > 0 && dotIndex < trimmed.length - 1
    ? trimmed.slice(dotIndex + 1).toLowerCase()
    : '';
}

export function getFeedbackFileValidationError(file: File): string | null {
  const fileName = file.name.trim();

  if (!fileName) return 'File name is required.';
  if (fileName === '.' || fileName === '..') return 'File name is not valid.';
  if (hasControlCharacter(fileName)) return 'File name contains invalid characters.';
  if (/[\\/]/u.test(fileName)) return 'File name cannot contain path separators.';
  if (file.size <= 0) return 'File is empty.';
  if (file.size > FEEDBACK_MAX_FILE_BYTES) return 'File is too large. Maximum size is 5 GB.';

  const extension = getBlockedExtensionFromName(fileName);
  if (extension) {
    return `Files with ".${extension}" extension are not allowed.`;
  }

  return null;
}

export function isAllowedFeedbackFileType(file: File): boolean {
  return !getBlockedExtensionFromName(file.name);
}
