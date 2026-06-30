import { describe, expect, test } from 'bun:test';

import { validateUploadedFile } from './validation';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const encoder = new TextEncoder();

type ZipEntry = {
    name: string;
    content: Uint8Array;
};

function bytes(value: string): Uint8Array {
    return encoder.encode(value);
}

function le16(value: number): number[] {
    return [value & 0xff, (value >> 8) & 0xff];
}

function le32(value: number): number[] {
    return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function le64(value: number): number[] {
    const bigValue = BigInt(value);
    return Array.from({ length: 8 }, (_, index) => Number((bigValue >> BigInt(index * 8)) & 0xffn));
}

function filePart(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

function concat(chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;

    for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.length;
    }

    return output;
}

function localHeader(entry: ZipEntry): Uint8Array {
    const nameBytes = bytes(entry.name);

    return concat([
        new Uint8Array([
            ...le32(0x04034b50),
            ...le16(20),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le32(0),
            ...le32(entry.content.length),
            ...le32(entry.content.length),
            ...le16(nameBytes.length),
            ...le16(0),
        ]),
        nameBytes,
        entry.content,
    ]);
}

function centralHeader(entry: ZipEntry, localOffset: number): Uint8Array {
    const nameBytes = bytes(entry.name);

    return concat([
        new Uint8Array([
            ...le32(0x02014b50),
            ...le16(20),
            ...le16(20),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le32(0),
            ...le32(entry.content.length),
            ...le32(entry.content.length),
            ...le16(nameBytes.length),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le16(0),
            ...le32(0),
            ...le32(localOffset),
        ]),
        nameBytes,
    ]);
}

function buildZip(
    entries: ZipEntry[],
    options: { comment?: string; zip64Directory?: boolean } = {}
): Uint8Array {
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;

    for (const entry of entries) {
        const localPart = localHeader(entry);
        localParts.push(localPart);
        centralParts.push(centralHeader(entry, offset));
        offset += localPart.length;
    }

    const centralDirectoryOffset = offset;
    const centralDirectory = concat(centralParts);
    const zip64RecordOffset = centralDirectoryOffset + centralDirectory.length;
    const zip64Record = options.zip64Directory
        ? new Uint8Array([
              ...le32(0x06064b50),
              ...le64(44),
              ...le16(45),
              ...le16(45),
              ...le32(0),
              ...le32(0),
              ...le64(entries.length),
              ...le64(entries.length),
              ...le64(centralDirectory.length),
              ...le64(centralDirectoryOffset),
          ])
        : new Uint8Array();
    const zip64Locator = options.zip64Directory
        ? new Uint8Array([...le32(0x07064b50), ...le32(0), ...le64(zip64RecordOffset), ...le32(1)])
        : new Uint8Array();
    const comment = bytes(options.comment ?? '');
    const endOfCentralDirectory = new Uint8Array([
        ...le32(0x06054b50),
        ...le16(0),
        ...le16(0),
        ...le16(options.zip64Directory ? 0xffff : entries.length),
        ...le16(options.zip64Directory ? 0xffff : entries.length),
        ...le32(options.zip64Directory ? 0xffffffff : centralDirectory.length),
        ...le32(options.zip64Directory ? 0xffffffff : centralDirectoryOffset),
        ...le16(comment.length),
    ]);

    return concat([
        ...localParts,
        centralDirectory,
        zip64Record,
        zip64Locator,
        endOfCentralDirectory,
        comment,
    ]);
}

function buildOfficeZip(
    directory: 'word' | 'xl' | 'ppt',
    options: { comment?: string; fillerBytes?: number; zip64Directory?: boolean } = {}
): Uint8Array {
    return buildZip(
        [
            { name: '[Content_Types].xml', content: bytes('<Types/>') },
            { name: `${directory}/document.xml`, content: bytes('<document/>') },
            {
                name: `${directory}/media/blob.bin`,
                content: new Uint8Array(options.fillerBytes ?? 0),
            },
        ],
        options
    );
}

function uploadRequest(file: File) {
    return {
        name: file.name.replace(/\.[^.]+$/u, ''),
        parentId: 'folder123',
        mimeType: file.type,
        size: file.size,
    };
}

describe('file upload content validation', () => {
    test('accepts large docx files whose central directory is past the head sample', async () => {
        const file = new File(
            [filePart(buildOfficeZip('word', { fillerBytes: 256 * 1024 }))],
            '100mb.docx',
            {
                type: DOCX_MIME,
            }
        );

        const result = await validateUploadedFile(file, uploadRequest(file));

        expect(result.extension).toBe('docx');
        expect(result.detectedMimeType).toBe(DOCX_MIME);
    });

    test('accepts OpenXML zips with an EOCD comment', async () => {
        const file = new File(
            [filePart(buildOfficeZip('word', { comment: 'created by test' }))],
            'note.docx',
            {
                type: DOCX_MIME,
            }
        );

        await expect(validateUploadedFile(file, uploadRequest(file))).resolves.toMatchObject({
            extension: 'docx',
        });
    });

    test('accepts ZIP64 OpenXML central directory metadata', async () => {
        const file = new File(
            [filePart(buildOfficeZip('word', { zip64Directory: true }))],
            'zip64.docx',
            {
                type: DOCX_MIME,
            }
        );

        await expect(validateUploadedFile(file, uploadRequest(file))).resolves.toMatchObject({
            extension: 'docx',
        });
    });

    test('rejects zip files renamed to docx when the word directory is missing', async () => {
        const file = new File(
            [filePart(buildZip([{ name: '[Content_Types].xml', content: bytes('<Types/>') }]))],
            'bad.docx',
            { type: DOCX_MIME }
        );

        await expect(validateUploadedFile(file, uploadRequest(file))).rejects.toThrow(
            'File content does not match the expected ".docx" format.'
        );
    });

    test('rejects an xlsx package uploaded with a docx extension', async () => {
        const file = new File([filePart(buildOfficeZip('xl'))], 'wrong.docx', { type: DOCX_MIME });

        await expect(validateUploadedFile(file, uploadRequest(file))).rejects.toThrow(
            'File content does not match the expected ".docx" format.'
        );
    });

    test('still accepts xlsx packages through the xlsx rule', async () => {
        const file = new File([filePart(buildOfficeZip('xl'))], 'book.xlsx', { type: XLSX_MIME });

        await expect(validateUploadedFile(file, uploadRequest(file))).resolves.toMatchObject({
            extension: 'xlsx',
            detectedMimeType: XLSX_MIME,
        });
    });
});
