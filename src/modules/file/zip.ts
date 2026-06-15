export type ZipStreamEntry = {
    path: string;
    directory?: boolean;
    modifiedAt?: Date;
    stream?: () => ReadableStream<Uint8Array>;
};

export type ZipProgress = {
    path: string;
    bytes: number;
};

export type ZipWritable = {
    write: (chunk: Uint8Array | string | ArrayBuffer | SharedArrayBuffer) => number;
    flush: () => number | Promise<number>;
};

type CentralDirectoryEntry = {
    pathBytes: Uint8Array;
    crc: number;
    compressedSize: number;
    uncompressedSize: number;
    offset: number;
    directory: boolean;
    modifiedAt: Date;
};

const encoder = new TextEncoder();
const ZIP32_LIMIT = 0xffffffff;
const UTF8_FLAG = 0x0800;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const DATA_DESCRIPTOR_LENGTH = 16;
const FLUSH_THRESHOLD = 8 * 1024 * 1024;

const crcTable = new Uint32Array(256);

for (let i = 0; i < crcTable.length; i += 1) {
    let value = i;

    for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    crcTable[i] = value >>> 0;
}

function updateCrc32(previous: number, data: Uint8Array): number {
    let crc = previous;

    for (const byte of data) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }

    return crc;
}

function finishCrc32(crc: number): number {
    return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime(date: Date): { date: number; time: number } {
    const year = Math.max(1980, date.getFullYear());
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = Math.floor(date.getSeconds() / 2);

    return {
        date: ((year - 1980) << 9) | (month << 5) | day,
        time: (hours << 11) | (minutes << 5) | seconds,
    };
}

function writeUint16(view: DataView, offset: number, value: number): void {
    view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
    view.setUint32(offset, value, true);
}

function assertZip32Size(value: number, label: string): void {
    if (value > ZIP32_LIMIT) {
        throw new Error(`${label} is too large for standard ZIP export.`);
    }
}

function assertZip32EntryCount(value: number): void {
    if (value > 0xffff) {
        throw new Error('Folder export contains too many ZIP entries for standard ZIP export.');
    }
}

function createLocalHeader(
    pathBytes: Uint8Array,
    modifiedAt: Date,
    useDataDescriptor: boolean
): Uint8Array {
    const { date, time } = toDosDateTime(modifiedAt);
    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);

    writeUint32(view, 0, 0x04034b50);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, UTF8_FLAG | (useDataDescriptor ? DATA_DESCRIPTOR_FLAG : 0));
    writeUint16(view, 8, 0);
    writeUint16(view, 10, time);
    writeUint16(view, 12, date);
    writeUint32(view, 14, 0);
    writeUint32(view, 18, 0);
    writeUint32(view, 22, 0);
    writeUint16(view, 26, pathBytes.byteLength);
    writeUint16(view, 28, 0);

    return header;
}

function createDataDescriptor(crc: number, size: number): Uint8Array {
    const descriptor = new Uint8Array(DATA_DESCRIPTOR_LENGTH);
    const view = new DataView(descriptor.buffer);

    writeUint32(view, 0, 0x08074b50);
    writeUint32(view, 4, crc);
    writeUint32(view, 8, size);
    writeUint32(view, 12, size);

    return descriptor;
}

function createCentralDirectoryHeader(entry: CentralDirectoryEntry): Uint8Array {
    const { date, time } = toDosDateTime(entry.modifiedAt);
    const header = new Uint8Array(46);
    const view = new DataView(header.buffer);

    writeUint32(view, 0, 0x02014b50);
    writeUint16(view, 4, 20);
    writeUint16(view, 6, 20);
    writeUint16(view, 8, UTF8_FLAG | (entry.directory ? 0 : DATA_DESCRIPTOR_FLAG));
    writeUint16(view, 10, 0);
    writeUint16(view, 12, time);
    writeUint16(view, 14, date);
    writeUint32(view, 16, entry.crc);
    writeUint32(view, 20, entry.compressedSize);
    writeUint32(view, 24, entry.uncompressedSize);
    writeUint16(view, 28, entry.pathBytes.byteLength);
    writeUint16(view, 30, 0);
    writeUint16(view, 32, 0);
    writeUint16(view, 34, 0);
    writeUint16(view, 36, 0);
    writeUint32(view, 38, entry.directory ? 0x10 : 0);
    writeUint32(view, 42, entry.offset);

    return header;
}

function createEndRecord(
    entryCount: number,
    centralLength: number,
    centralOffset: number
): Uint8Array {
    const endRecord = new Uint8Array(22);
    const view = new DataView(endRecord.buffer);

    writeUint32(view, 0, 0x06054b50);
    writeUint16(view, 4, 0);
    writeUint16(view, 6, 0);
    writeUint16(view, 8, entryCount);
    writeUint16(view, 10, entryCount);
    writeUint32(view, 12, centralLength);
    writeUint32(view, 16, centralOffset);
    writeUint16(view, 20, 0);

    return endRecord;
}

async function writeChunk(
    sink: ZipWritable,
    chunk: Uint8Array,
    state: { offset: number; unflushedBytes: number }
): Promise<void> {
    sink.write(chunk);
    state.offset += chunk.byteLength;
    state.unflushedBytes += chunk.byteLength;

    if (state.unflushedBytes >= FLUSH_THRESHOLD) {
        await sink.flush();
        state.unflushedBytes = 0;
    }
}

export async function writeZipArchiveToSink(
    entries: ZipStreamEntry[],
    sink: ZipWritable,
    onFileComplete?: (progress: ZipProgress) => Promise<void> | void
): Promise<number> {
    const centralDirectory: CentralDirectoryEntry[] = [];
    const state = { offset: 0, unflushedBytes: 0 };

    for (const entry of entries) {
        const normalizedPath =
            entry.directory && !entry.path.endsWith('/') ? `${entry.path}/` : entry.path;
        const pathBytes = encoder.encode(normalizedPath);
        const localHeaderOffset = state.offset;

        assertZip32Size(localHeaderOffset, 'ZIP offset');

        await writeChunk(
            sink,
            createLocalHeader(pathBytes, entry.modifiedAt ?? new Date(), !entry.directory),
            state
        );
        await writeChunk(sink, pathBytes, state);

        if (entry.directory) {
            centralDirectory.push({
                pathBytes,
                crc: 0,
                compressedSize: 0,
                uncompressedSize: 0,
                offset: localHeaderOffset,
                directory: true,
                modifiedAt: entry.modifiedAt ?? new Date(),
            });
            continue;
        }

        if (!entry.stream) throw new Error(`Missing stream for ZIP entry ${entry.path}`);

        let crc = 0xffffffff;
        let size = 0;
        const reader = entry.stream().getReader();

        while (true) {
            const result = await reader.read();
            if (result.done) break;

            const chunk = result.value;
            crc = updateCrc32(crc, chunk);
            size += chunk.byteLength;

            assertZip32Size(size, entry.path);
            await writeChunk(sink, chunk, state);
        }

        const checksum = finishCrc32(crc);
        await writeChunk(sink, createDataDescriptor(checksum, size), state);

        centralDirectory.push({
            pathBytes,
            crc: checksum,
            compressedSize: size,
            uncompressedSize: size,
            offset: localHeaderOffset,
            directory: false,
            modifiedAt: entry.modifiedAt ?? new Date(),
        });

        await onFileComplete?.({ path: normalizedPath, bytes: size });
    }

    const centralOffset = state.offset;

    for (const entry of centralDirectory) {
        const centralHeader = createCentralDirectoryHeader(entry);
        await writeChunk(sink, centralHeader, state);
        await writeChunk(sink, entry.pathBytes, state);
    }

    const centralLength = state.offset - centralOffset;

    assertZip32Size(centralLength, 'ZIP central directory');
    assertZip32Size(centralOffset, 'ZIP central directory offset');
    assertZip32EntryCount(centralDirectory.length);

    await writeChunk(
        sink,
        createEndRecord(centralDirectory.length, centralLength, centralOffset),
        state
    );
    await sink.flush();

    return state.offset;
}
