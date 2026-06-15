export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_NAME_LENGTH = 180;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  'csv',
  'docx',
  'jpeg',
  'jpg',
  'pdf',
  'png',
  'pptx',
  'txt',
  'webp',
  'xlsx',
] as const;

export const FILE_UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',');

const DANGEROUS_EXTENSIONS = new Set([
  'app',
  'apk',
  'asp',
  'aspx',
  'bat',
  'bash',
  'bin',
  'cmd',
  'com',
  'cpl',
  'dll',
  'dmg',
  'exe',
  'gadget',
  'hta',
  'html',
  'inf',
  'jar',
  'js',
  'jse',
  'jsp',
  'jspx',
  'lnk',
  'msi',
  'php',
  'phtml',
  'ps1',
  'reg',
  'scr',
  'sh',
  'svg',
  'sys',
  'vbe',
  'vbs',
  'wsf',
  'wsh',
]);

const MIME_BY_EXTENSION: Record<(typeof ALLOWED_UPLOAD_EXTENSIONS)[number], readonly string[]> = {
  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  jpeg: ['image/jpeg', 'image/pjpeg'],
  jpg: ['image/jpeg', 'image/pjpeg'],
  pdf: ['application/pdf'],
  png: ['image/png'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  txt: ['text/plain'],
  webp: ['image/webp'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

export function formatUploadFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const size = bytes / 1024 ** index;

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function getUploadFileExtension(name: string): string {
  const trimmed = name.trim();
  const dotIndex = trimmed.lastIndexOf('.');

  return dotIndex > 0 && dotIndex < trimmed.length - 1
    ? trimmed.slice(dotIndex + 1).toLowerCase()
    : '';
}

export function getUploadNameError(name: string, label = 'File name'): string | null {
  const trimmed = name.trim();

  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > MAX_UPLOAD_NAME_LENGTH) {
    return `${label} must be ${MAX_UPLOAD_NAME_LENGTH} characters or fewer.`;
  }

  if (hasInvalidControlCharacter(trimmed)) {
    return `${label} contains invalid characters.`;
  }

  if (/[\\/]/u.test(trimmed)) {
    return `${label} cannot contain path separators.`;
  }

  if (trimmed === '.' || trimmed === '..') {
    return `${label} is not valid.`;
  }

  return null;
}

export function getUploadDisplayNameValidationError(
  name: string,
  file: File,
  label = 'File name'
): string | null {
  const nameError = getUploadNameError(name, label);
  if (nameError) return nameError;

  const visibleExtension = getUploadFileExtension(name);
  if (!visibleExtension) return null;

  if (DANGEROUS_EXTENSIONS.has(visibleExtension)) {
    return `${label} cannot end with ".${visibleExtension}".`;
  }

  if (!isAllowedUploadExtension(visibleExtension)) return null;

  const uploadExtension = getUploadFileExtension(file.name);
  if (!areEquivalentExtensions(visibleExtension, uploadExtension)) {
    return `${label} extension ".${visibleExtension}" does not match selected ".${uploadExtension}" file.`;
  }

  return null;
}

function hasInvalidControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const charCode = value.charCodeAt(index);

    if (charCode <= 0x1f || charCode === 0x7f) return true;
  }

  return false;
}

export function getUploadFileValidationError(
  file: File,
  options: { accept?: string; maxSize?: number } = {}
): string | null {
  const maxSize = options.maxSize ?? MAX_UPLOAD_BYTES;
  const fileNameError = getUploadNameError(file.name, 'Uploaded file name');

  if (fileNameError) return fileNameError;
  if (file.size <= 0) return 'File is empty.';
  if (file.size > maxSize) {
    return `File is too large. Maximum size is ${formatUploadFileSize(maxSize)}.`;
  }

  const extension = getUploadFileExtension(file.name);
  if (!extension) return 'File must have an extension.';

  if (DANGEROUS_EXTENSIONS.has(extension)) {
    return `Files with ".${extension}" extension are not allowed.`;
  }

  const segments = file.name
    .toLowerCase()
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments.slice(0, -1)) {
    if (DANGEROUS_EXTENSIONS.has(segment)) {
      return `File name contains blocked extension ".${segment}".`;
    }
  }

  if (!isAllowedUploadExtension(extension)) {
    return `Unsupported file type ".${extension}". Allowed types: ${ALLOWED_UPLOAD_EXTENSIONS.map(
      (ext) => `.${ext}`
    ).join(', ')}.`;
  }

  if (!isAcceptedByInput(extension, file.type, options.accept ?? FILE_UPLOAD_ACCEPT)) {
    return `File type ".${extension}" is not allowed for this upload.`;
  }

  if (!isCompatibleMime(extension, file.type)) {
    return `File content type "${file.type}" does not match ".${extension}" files.`;
  }

  return null;
}

export function assertUploadFileIsValid(
  file: File,
  data: { name: string; size: number },
  options?: { accept?: string; maxSize?: number }
): void {
  const fileError = getUploadFileValidationError(file, options);
  if (fileError) throw new Error(fileError);

  const nameError = getUploadDisplayNameValidationError(data.name, file);
  if (nameError) throw new Error(nameError);

  if (data.size !== file.size) {
    throw new Error('File size metadata does not match the selected file.');
  }
}

function isAllowedUploadExtension(
  extension: string
): extension is (typeof ALLOWED_UPLOAD_EXTENSIONS)[number] {
  return ALLOWED_UPLOAD_EXTENSIONS.includes(
    extension as (typeof ALLOWED_UPLOAD_EXTENSIONS)[number]
  );
}

function areEquivalentExtensions(left: string, right: string): boolean {
  if (left === right) return true;

  return (left === 'jpg' && right === 'jpeg') || (left === 'jpeg' && right === 'jpg');
}

function normalizeMimeType(value: string): string {
  return value.split(';')[0]?.trim().toLowerCase() ?? '';
}

function isCompatibleMime(
  extension: (typeof ALLOWED_UPLOAD_EXTENSIONS)[number],
  mimeType: string
): boolean {
  const normalized = normalizeMimeType(mimeType);

  if (!normalized || normalized === 'application/octet-stream') return true;

  return MIME_BY_EXTENSION[extension].includes(normalized);
}

function isAcceptedByInput(extension: string, mimeType: string, accept: string): boolean {
  const acceptRules = accept
    .split(',')
    .map((rule) => rule.trim().toLowerCase())
    .filter(Boolean);

  if (acceptRules.length === 0) return true;

  const normalizedMime = normalizeMimeType(mimeType);

  return acceptRules.some((rule) => {
    if (rule.startsWith('.')) return rule.slice(1) === extension;
    if (rule.endsWith('/*')) {
      return normalizedMime.startsWith(`${rule.slice(0, -1)}`);
    }

    return normalizedMime === rule;
  });
}
