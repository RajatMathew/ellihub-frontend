import { BadRequestError } from '@utils';

import type { FileUploadRequest } from './models';

const MAX_FILE_NAME_LENGTH = 180;
const TEXT_SAMPLE_BYTES = 64 * 1024;
const SIGNATURE_SAMPLE_BYTES = 128 * 1024;
const ZIP_TAIL_SAMPLE_BYTES = 1024 * 1024;
const MAX_ZIP_CENTRAL_DIRECTORY_BYTES = 8 * 1024 * 1024;

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

type ZipCentralDirectoryInfo = {
    offset: number;
    size: number;
};

export type UploadFileSource = {
    name: string;
    type?: string;
    size: number;
    readRange: (start: number, endExclusive: number) => Promise<Uint8Array>;
};

const OPEN_XML_DIRECTORIES = {
    docx: 'word/',
    pptx: 'ppt/',
    xlsm: 'xl/',
    xlsx: 'xl/',
} as const;

const ALLOWED_FILE_TYPES = {
    // Documents commonly exchanged for contracts, RFIs, submittals, and closeout packages.
    csv: {
        mimeType: 'text/csv',
        alternativeMimeTypes: ['application/csv', 'application/vnd.ms-excel', 'text/plain'],
        signature: looksLikeText,
    },
    doc: {
        mimeType: 'application/msword',
        alternativeMimeTypes: ['application/vnd.ms-word'],
        signature: isOleCompoundFile,
    },
    docx: {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        signature: isZip,
    },
    pdf: {
        mimeType: 'application/pdf',
        signature: isPdf,
    },
    ppt: {
        mimeType: 'application/vnd.ms-powerpoint',
        signature: isOleCompoundFile,
    },
    pptx: {
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        signature: isZip,
    },
    rtf: {
        mimeType: 'application/rtf',
        alternativeMimeTypes: ['text/rtf'],
        signature: isRtf,
    },
    txt: {
        mimeType: 'text/plain',
        signature: looksLikeText,
    },
    xml: {
        mimeType: 'application/xml',
        alternativeMimeTypes: ['text/xml'],
        signature: looksLikeText,
    },

    // Spreadsheets, schedules, estimates, and project plans.
    xls: {
        mimeType: 'application/vnd.ms-excel',
        signature: isOleCompoundFile,
    },
    xlsm: {
        mimeType: 'application/vnd.ms-excel.sheet.macroenabled.12',
        signature: isZip,
    },
    xlsx: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        signature: isZip,
    },
    mpp: {
        mimeType: 'application/vnd.ms-project',
        alternativeMimeTypes: ['application/msproj', 'application/msproject'],
        signature: isOleCompoundFile,
    },

    // Site photos, scanned documents, video walkthroughs, and audio notes.
    heic: {
        mimeType: 'image/heic',
        alternativeMimeTypes: ['image/heif'],
        signature: isIsoBaseMedia,
    },
    heif: {
        mimeType: 'image/heif',
        alternativeMimeTypes: ['image/heic'],
        signature: isIsoBaseMedia,
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
    png: {
        mimeType: 'image/png',
        signature: isPng,
    },
    tif: {
        mimeType: 'image/tiff',
        signature: isTiff,
    },
    tiff: {
        mimeType: 'image/tiff',
        signature: isTiff,
    },
    webp: {
        mimeType: 'image/webp',
        signature: isWebp,
    },
    m4a: {
        mimeType: 'audio/mp4',
        alternativeMimeTypes: ['audio/x-m4a'],
        signature: isIsoBaseMedia,
    },
    m4v: {
        mimeType: 'video/mp4',
        alternativeMimeTypes: ['video/x-m4v'],
        signature: isIsoBaseMedia,
    },
    mov: {
        mimeType: 'video/quicktime',
        signature: isIsoBaseMedia,
    },
    mp3: {
        mimeType: 'audio/mpeg',
        alternativeMimeTypes: ['audio/mp3'],
        signature: isMp3,
    },
    mp4: {
        mimeType: 'video/mp4',
        signature: isIsoBaseMedia,
    },
    wav: {
        mimeType: 'audio/wav',
        alternativeMimeTypes: ['audio/x-wav'],
        signature: isWav,
    },
    webm: {
        mimeType: 'video/webm',
        alternativeMimeTypes: ['audio/webm'],
        signature: isWebm,
    },

    // Drawing and model formats used in construction coordination.
    dwg: {
        mimeType: 'image/vnd.dwg',
        alternativeMimeTypes: ['application/acad', 'application/x-acad', 'application/x-autocad'],
        signature: isDwg,
    },
    dxf: {
        mimeType: 'image/vnd.dxf',
        alternativeMimeTypes: ['application/dxf', 'application/x-dxf', 'application/x-autocad'],
        signature: looksLikeText,
    },
    ifc: {
        mimeType: 'application/x-step',
        alternativeMimeTypes: ['application/step', 'text/plain'],
        signature: looksLikeText,
    },
    nwc: {
        mimeType: 'application/octet-stream',
        alternativeMimeTypes: ['application/x-navisworks'],
        signature: isNonEmptyBinary,
    },
    nwd: {
        mimeType: 'application/octet-stream',
        alternativeMimeTypes: ['application/x-navisworks'],
        signature: isNonEmptyBinary,
    },
    rfa: {
        mimeType: 'application/octet-stream',
        alternativeMimeTypes: ['application/x-revit'],
        signature: isNonEmptyBinary,
    },
    rvt: {
        mimeType: 'application/octet-stream',
        alternativeMimeTypes: ['application/x-revit'],
        signature: isNonEmptyBinary,
    },
    skp: {
        mimeType: 'application/octet-stream',
        alternativeMimeTypes: ['application/vnd.sketchup.skp', 'application/x-skp'],
        signature: isNonEmptyBinary,
    },

    // Archives are useful for drawing packages and vendor submittal bundles.
    zip: {
        mimeType: 'application/zip',
        alternativeMimeTypes: ['application/x-zip-compressed'],
        signature: isZip,
    },
    '7z': {
        mimeType: 'application/x-7z-compressed',
        signature: is7z,
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

export function getMaxUploadBytes(): number | null {
    const rawValue = process.env.FILE_UPLOAD_MAX_BYTES?.trim();
    if (!rawValue) return null;

    const configured = Number(rawValue);

    if (Number.isFinite(configured) && configured > 0) {
        return Math.floor(configured);
    }

    return null;
}

export function validateUploadMetadata(
    source: Pick<UploadFileSource, 'name' | 'type' | 'size'>,
    request: FileUploadRequest
): ValidatedUploadFile {
    if (source.size <= 0) throw new BadRequestError('Uploaded file is empty.');

    const maxUploadBytes = getMaxUploadBytes();
    if (maxUploadBytes !== null && source.size > maxUploadBytes) {
        throw new BadRequestError(
            `File is too large. Maximum allowed size is ${formatFileSize(maxUploadBytes)}.`
        );
    }

    if (request.size !== source.size) {
        throw new BadRequestError('File size metadata does not match the uploaded file.');
    }

    const originalName = validateFileName(source.name, 'Uploaded file name');
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

    const declaredMimeType = normalizeMimeType(source.type || request.mimeType);
    if (declaredMimeType && declaredMimeType !== 'application/octet-stream') {
        const acceptedMimeTypes = new Set([rule.mimeType, ...(rule.alternativeMimeTypes ?? [])]);

        if (!acceptedMimeTypes.has(declaredMimeType)) {
            throw new BadRequestError(
                `File content type "${declaredMimeType}" does not match ".${extension}" files.`
            );
        }
    }

    return {
        request: {
            name: displayName,
            displayName: sanitizedDisplayName,
            parentId: request.parentId,
            mimeType: rule.mimeType,
            size: source.size,
        },
        extension,
        detectedMimeType: rule.mimeType,
    };
}

export async function validateUploadedFile(
    file: File,
    request: FileUploadRequest
): Promise<ValidatedUploadFile> {
    return validateUploadedFileSource(
        {
            name: file.name,
            type: file.type,
            size: file.size,
            readRange: async (start, endExclusive) =>
                new Uint8Array(await file.slice(start, endExclusive).arrayBuffer()),
        },
        request
    );
}

export async function validateUploadedFileSource(
    source: UploadFileSource,
    request: FileUploadRequest
): Promise<ValidatedUploadFile> {
    const validated = validateUploadMetadata(source, request);
    const rule = getFileTypeRule(validated.extension);

    if (!rule || !(await validateFileContent(source, validated.extension, rule))) {
        throw new BadRequestError(
            `File content does not match the expected ".${validated.extension}" format.`
        );
    }

    return validated;
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

async function validateFileContent(
    source: UploadFileSource,
    extension: string,
    rule: FileTypeRule
): Promise<boolean> {
    const headBytes = await readFileHeadSample(source);

    if (isOpenXmlExtension(extension)) {
        return isOpenXmlDocument(source, headBytes, OPEN_XML_DIRECTORIES[extension]);
    }

    return rule.signature(headBytes);
}

function isOpenXmlExtension(extension: string): extension is keyof typeof OPEN_XML_DIRECTORIES {
    return extension in OPEN_XML_DIRECTORIES;
}

async function readFileHeadSample(source: UploadFileSource): Promise<Uint8Array> {
    const sampleSize = Math.min(source.size, SIGNATURE_SAMPLE_BYTES);
    return source.readRange(0, sampleSize);
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

function isTiff(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0x49, 0x49, 0x2a, 0x00]) || hasPrefix(bytes, [0x4d, 0x4d, 0x00, 0x2a]);
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

function isIsoBaseMedia(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 12 &&
        bytes[4] === 0x66 &&
        bytes[5] === 0x74 &&
        bytes[6] === 0x79 &&
        bytes[7] === 0x70
    );
}

function isMp3(bytes: Uint8Array): boolean {
    return (
        hasPrefix(bytes, [0x49, 0x44, 0x33]) ||
        (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    );
}

function isWav(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 12 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46 &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x41 &&
        bytes[10] === 0x56 &&
        bytes[11] === 0x45
    );
}

function isWebm(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
}

function isZip(bytes: Uint8Array): boolean {
    return (
        hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
        hasPrefix(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
        hasPrefix(bytes, [0x50, 0x4b, 0x07, 0x08])
    );
}

function is7z(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
}

function isOleCompoundFile(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

function isRtf(bytes: Uint8Array): boolean {
    return hasPrefix(bytes, [0x7b, 0x5c, 0x72, 0x74, 0x66]);
}

function isDwg(bytes: Uint8Array): boolean {
    return (
        bytes.length >= 6 &&
        bytes[0] === 0x41 &&
        bytes[1] === 0x43 &&
        bytes[2] === 0x31 &&
        bytes[3] === 0x30
    );
}

function isNonEmptyBinary(bytes: Uint8Array): boolean {
    return bytes.length > 0;
}

async function isOpenXmlDocument(
    source: UploadFileSource,
    headBytes: Uint8Array,
    expectedDirectory: string
): Promise<boolean> {
    if (!isZip(headBytes)) return false;

    const entries = await readZipCentralDirectoryEntries(source);

    return (
        entries.includes('[Content_Types].xml') &&
        entries.some((entry) => entry.startsWith(expectedDirectory))
    );
}

async function readZipCentralDirectoryEntries(source: UploadFileSource): Promise<string[]> {
    const tailStart = Math.max(0, source.size - ZIP_TAIL_SAMPLE_BYTES);
    const tailBytes = await source.readRange(tailStart, source.size);
    const endOfCentralDirectoryOffset = findEndOfCentralDirectoryOffset(tailBytes);

    if (endOfCentralDirectoryOffset === -1) return [];

    const centralDirectoryInfo = await readZipCentralDirectoryInfo(
        source,
        tailBytes,
        tailStart,
        endOfCentralDirectoryOffset
    );

    if (!centralDirectoryInfo) return [];

    const centralDirectoryEnd = centralDirectoryInfo.offset + centralDirectoryInfo.size;
    const centralDirectoryBytes =
        centralDirectoryInfo.offset >= tailStart &&
        centralDirectoryEnd <= tailStart + tailBytes.byteLength
            ? tailBytes.subarray(
                  centralDirectoryInfo.offset - tailStart,
                  centralDirectoryEnd - tailStart
              )
            : await source.readRange(centralDirectoryInfo.offset, centralDirectoryEnd);

    return parseZipCentralDirectoryEntries(centralDirectoryBytes);
}

async function readZipCentralDirectoryInfo(
    source: UploadFileSource,
    tailBytes: Uint8Array,
    tailStart: number,
    endOfCentralDirectoryOffset: number
): Promise<ZipCentralDirectoryInfo | null> {
    const tailView = new DataView(tailBytes.buffer, tailBytes.byteOffset, tailBytes.byteLength);
    const centralDirectorySize = tailView.getUint32(endOfCentralDirectoryOffset + 12, true);
    const centralDirectoryOffset = tailView.getUint32(endOfCentralDirectoryOffset + 16, true);

    if (centralDirectorySize !== 0xffffffff && centralDirectoryOffset !== 0xffffffff) {
        return normalizeZipCentralDirectoryInfo(
            source,
            centralDirectoryOffset,
            centralDirectorySize
        );
    }

    return readZip64CentralDirectoryInfo(source, tailBytes, tailStart, endOfCentralDirectoryOffset);
}

async function readZip64CentralDirectoryInfo(
    source: UploadFileSource,
    tailBytes: Uint8Array,
    tailStart: number,
    endOfCentralDirectoryOffset: number
): Promise<ZipCentralDirectoryInfo | null> {
    const locatorOffset = endOfCentralDirectoryOffset - 20;
    if (locatorOffset < 0) return null;

    const locatorView = new DataView(
        tailBytes.buffer,
        tailBytes.byteOffset + locatorOffset,
        tailBytes.byteLength - locatorOffset
    );

    if (locatorView.getUint32(0, true) !== 0x07064b50) return null;

    const recordOffset = getSafeZipNumber(locatorView.getBigUint64(8, true));
    if (recordOffset === null || recordOffset + 56 > source.size) return null;

    const recordBytes =
        recordOffset >= tailStart && recordOffset + 56 <= tailStart + tailBytes.byteLength
            ? tailBytes.subarray(recordOffset - tailStart, recordOffset - tailStart + 56)
            : await source.readRange(recordOffset, recordOffset + 56);
    const recordView = new DataView(
        recordBytes.buffer,
        recordBytes.byteOffset,
        recordBytes.byteLength
    );

    if (recordView.getUint32(0, true) !== 0x06064b50) return null;

    const centralDirectorySize = getSafeZipNumber(recordView.getBigUint64(40, true));
    const centralDirectoryOffset = getSafeZipNumber(recordView.getBigUint64(48, true));

    if (centralDirectorySize === null || centralDirectoryOffset === null) return null;

    return normalizeZipCentralDirectoryInfo(source, centralDirectoryOffset, centralDirectorySize);
}

function normalizeZipCentralDirectoryInfo(
    source: Pick<UploadFileSource, 'size'>,
    offset: number,
    size: number
): ZipCentralDirectoryInfo | null {
    if (
        size <= 0 ||
        size > MAX_ZIP_CENTRAL_DIRECTORY_BYTES ||
        offset < 0 ||
        offset > source.size - size
    ) {
        return null;
    }

    return { offset, size };
}

function getSafeZipNumber(value: bigint): number | null {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) return null;

    return Number(value);
}

function findEndOfCentralDirectoryOffset(bytes: Uint8Array): number {
    for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
        if (
            bytes[offset] !== 0x50 ||
            bytes[offset + 1] !== 0x4b ||
            bytes[offset + 2] !== 0x05 ||
            bytes[offset + 3] !== 0x06
        ) {
            continue;
        }

        const view = new DataView(
            bytes.buffer,
            bytes.byteOffset + offset,
            bytes.byteLength - offset
        );
        const commentLength = view.getUint16(20, true);

        if (offset + 22 + commentLength === bytes.length) return offset;
    }

    return -1;
}

function parseZipCentralDirectoryEntries(bytes: Uint8Array): string[] {
    const decoder = new TextDecoder();
    const entries: string[] = [];
    let offset = 0;

    while (offset + 46 <= bytes.length) {
        if (
            bytes[offset] !== 0x50 ||
            bytes[offset + 1] !== 0x4b ||
            bytes[offset + 2] !== 0x01 ||
            bytes[offset + 3] !== 0x02
        ) {
            break;
        }

        const view = new DataView(
            bytes.buffer,
            bytes.byteOffset + offset,
            bytes.byteLength - offset
        );
        const fileNameLength = view.getUint16(28, true);
        const extraFieldLength = view.getUint16(30, true);
        const fileCommentLength = view.getUint16(32, true);
        const fileNameStart = offset + 46;
        const fileNameEnd = fileNameStart + fileNameLength;
        const nextOffset = fileNameEnd + extraFieldLength + fileCommentLength;

        if (fileNameEnd > bytes.length || nextOffset > bytes.length) break;

        entries.push(
            decoder.decode(bytes.subarray(fileNameStart, fileNameEnd)).replace(/\\/g, '/')
        );
        offset = nextOffset;
    }

    return entries;
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
