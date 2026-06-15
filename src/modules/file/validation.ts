import { BadRequestError } from '@utils';

import type { FileUploadRequest } from './models';

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 180;
const TEXT_SAMPLE_BYTES = 64 * 1024;
const SIGNATURE_SAMPLE_BYTES = 128 * 1024;

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

type FileTypeRule = {
    mimeType: string;
    alternativeMimeTypes?: readonly string[];
    signature: (bytes: Uint8Array) => boolean;
};

const ALLOWED_FILE_TYPES = {
    csv: {
        mimeType: 'text/csv',
        alternativeMimeTypes: ['application/csv', 'application/vnd.ms-excel', 'text/plain'],
        signature: looksLikeText,
    },
    docx: {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        signature: (bytes) => isOpenXmlDocument(bytes, 'word/'),
    },
    jpeg: {
        mimeType: 'image/jpeg',
        alternativeMimeTypes: ['image/pjpeg'],
        signature: isJpeg,
    },
    jpg: {
        mimeType: 'image/jpeg',
        alternativeMimeTypes: ['image/pjpeg'],
        signature: isJpeg,
    },
    pdf: {
        mimeType: 'application/pdf',
        signature: isPdf,
    },
    png: {
        mimeType: 'image/png',
        signature: isPng,
    },
    pptx: {
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        signature: (bytes) => isOpenXmlDocument(bytes, 'ppt/'),
    },
    txt: {
        mimeType: 'text/plain',
        signature: looksLikeText,
    },
    webp: {
        mimeType: 'image/webp',
        signature: isWebp,
    },
    xlsx: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        signature: (bytes) => isOpenXmlDocument(bytes, 'xl/'),
    },
} satisfies Record<string, FileTypeRule>;

export const allowedUploadExtensions = Object.keys(ALLOWED_FILE_TYPES);
export const allowedUploadExtensionList = allowedUploadExtensions
    .map((extension) => `.${extension}`)
    .join(', ');

export type ValidatedUploadFile = {
    request: FileUploadRequest;
    extension: string;
    detectedMimeType: string;
};

export function getMaxUploadBytes(): number {
    const configured = Number(process.env.FILE_UPLOAD_MAX_BYTES);

    if (Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }

    return DEFAULT_MAX_UPLOAD_BYTES;
}

export async function validateUploadedFile(
    file: File,
    request: FileUploadRequest
): Promise<ValidatedUploadFile> {
    if (file.size <= 0) throw new BadRequestError('Uploaded file is empty.');

    const maxUploadBytes = getMaxUploadBytes();
    if (file.size > maxUploadBytes) {
        throw new BadRequestError(
            `File is too large. Maximum allowed size is ${formatFileSize(maxUploadBytes)}.`
        );
    }

    if (request.size !== file.size) {
        throw new BadRequestError('File size metadata does not match the uploaded file.');
    }

    const originalName = validateFileName(file.name, 'Uploaded file name');
    const extension = getExtension(originalName);
    if (!extension) throw new BadRequestError('Uploaded file must have a file extension.');

    if (DANGEROUS_EXTENSIONS.has(extension)) {
        throw new BadRequestError(`Files with ".${extension}" extension are not allowed.`);
    }

    const rule = getFileTypeRule(extension);
    if (!rule) {
        throw new BadRequestError(
            `Unsupported file type ".${extension}". Allowed types: ${allowedUploadExtensionList}.`
        );
    }

    assertNoDangerousDoubleExtension(originalName);

    const displayName = validateFileName(request.name, 'File name');
    assertVisibleNameExtensionMatchesUpload(displayName, extension, 'File name');

    const sanitizedDisplayName = request.displayName
        ? validateFileName(request.displayName, 'Display name')
        : request.displayName;

    if (sanitizedDisplayName) {
        assertVisibleNameExtensionMatchesUpload(sanitizedDisplayName, extension, 'Display name');
    }

    const declaredMimeType = normalizeMimeType(file.type || request.mimeType);
    if (declaredMimeType && declaredMimeType !== 'application/octet-stream') {
        const acceptedMimeTypes = new Set([rule.mimeType, ...(rule.alternativeMimeTypes ?? [])]);

        if (!acceptedMimeTypes.has(declaredMimeType)) {
            throw new BadRequestError(
                `File content type "${declaredMimeType}" does not match ".${extension}" files.`
            );
        }
    }

    const bytes = await readFileSample(file);
    if (!rule.signature(bytes)) {
        throw new BadRequestError(
            `File content does not match the expected ".${extension}" format.`
        );
    }

    return {
        request: {
            ...request,
            name: displayName,
            displayName: sanitizedDisplayName,
            mimeType: rule.mimeType,
            size: file.size,
        },
        extension,
        detectedMimeType: rule.mimeType,
    };
}

function getFileTypeRule(extension: string): FileTypeRule | undefined {
    return ALLOWED_FILE_TYPES[extension as keyof typeof ALLOWED_FILE_TYPES];
}

function getExtension(name: string): string {
    const trimmed = name.trim();
    const dotIndex = trimmed.lastIndexOf('.');

    return dotIndex > 0 && dotIndex < trimmed.length - 1
        ? trimmed.slice(dotIndex + 1).toLowerCase()
        : '';
}

function validateFileName(value: string, label: string): string {
    const normalized = value.trim();

    if (!normalized) throw new BadRequestError(`${label} is required.`);
    if (normalized.length > MAX_FILE_NAME_LENGTH) {
        throw new BadRequestError(`${label} must be ${MAX_FILE_NAME_LENGTH} characters or fewer.`);
    }

    if (hasInvalidControlCharacter(normalized)) {
        throw new BadRequestError(`${label} contains invalid control characters.`);
    }

    if (/[\\/]/u.test(normalized)) {
        throw new BadRequestError(`${label} cannot contain path separators.`);
    }

    if (normalized === '.' || normalized === '..') {
        throw new BadRequestError(`${label} is not valid.`);
    }

    return normalized;
}

function hasInvalidControlCharacter(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const charCode = value.charCodeAt(index);

        if (charCode <= 0x1f || charCode === 0x7f) return true;
    }

    return false;
}

function assertNoDangerousDoubleExtension(name: string): void {
    const segments = name
        .toLowerCase()
        .split('.')
        .map((segment) => segment.trim())
        .filter(Boolean);

    for (const segment of segments.slice(0, -1)) {
        if (DANGEROUS_EXTENSIONS.has(segment)) {
            throw new BadRequestError(`File name contains blocked extension ".${segment}".`);
        }
    }
}

function assertVisibleNameExtensionMatchesUpload(
    name: string,
    uploadExtension: string,
    label: string
): void {
    const visibleExtension = getExtension(name);
    if (!visibleExtension) return;

    if (DANGEROUS_EXTENSIONS.has(visibleExtension)) {
        throw new BadRequestError(`${label} cannot end with ".${visibleExtension}".`);
    }

    if (!getFileTypeRule(visibleExtension)) return;

    if (!areEquivalentExtensions(visibleExtension, uploadExtension)) {
        throw new BadRequestError(
            `${label} extension ".${visibleExtension}" does not match uploaded ".${uploadExtension}" file.`
        );
    }
}

function areEquivalentExtensions(left: string, right: string): boolean {
    if (left === right) return true;

    return (left === 'jpg' && right === 'jpeg') || (left === 'jpeg' && right === 'jpg');
}

function normalizeMimeType(value?: string): string {
    return value?.split(';')[0]?.trim().toLowerCase() ?? '';
}

async function readFileSample(file: File): Promise<Uint8Array> {
    const sampleSize = Math.min(file.size, SIGNATURE_SAMPLE_BYTES);
    return new Uint8Array(await file.slice(0, sampleSize).arrayBuffer());
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
    if (bytes.length < prefix.length) return false;
    return prefix.every((byte, index) => bytes[index] === byte);
}

function isPdf(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
}

function isPng(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

function isJpeg(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
}

function isWebp(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
    );
}

function isZip(bytes: Uint8Array): boolean {
    return (
        hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
        hasPrefix(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
        hasPrefix(bytes, [0x50, 0x4b, 0x07, 0x08])
    );
}

function isOpenXmlDocument(bytes: Uint8Array, expectedDirectory: string): boolean {
    if (!isZip(bytes)) return false;

    return containsAscii(bytes, '[Content_Types].xml') && containsAscii(bytes, expectedDirectory);
}

function containsAscii(bytes: Uint8Array, needle: string): boolean {
    const needleBytes = new TextEncoder().encode(needle);
    if (needleBytes.length === 0 || bytes.length < needleBytes.length) return false;

    outer: for (let i = 0; i <= bytes.length - needleBytes.length; i += 1) {
        for (let j = 0; j < needleBytes.length; j += 1) {
            if (bytes[i + j] !== needleBytes[j]) continue outer;
        }

        return true;
    }

    return false;
}

function looksLikeText(bytes: Uint8Array): boolean {
    const sample = bytes.subarray(0, Math.min(bytes.length, TEXT_SAMPLE_BYTES));
    if (sample.length === 0) return false;

    let suspiciousControls = 0;
    for (const byte of sample) {
        if (byte === 0) return false;
        const isAllowedControl = byte === 0x09 || byte === 0x0a || byte === 0x0d;
        if (byte < 0x20 && !isAllowedControl) suspiciousControls += 1;
    }

    return suspiciousControls / sample.length < 0.01;
}

function formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const size = bytes / 1024 ** index;

    return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
