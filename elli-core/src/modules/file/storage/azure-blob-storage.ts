import { InternalServerError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';

import type {
    FileStorageService,
    StorageReadOptions,
    StorageWriter,
    StorageWriteChunk,
} from './types';

const AZURE_STORAGE_VERSION = '2023-11-03';
const AZURE_BLOCK_SIZE = 8 * 1024 * 1024;
const encoder = new TextEncoder();

type AzureBlobSasConfig = {
    containerUrl: string;
    sasToken: string;
};

let config: AzureBlobSasConfig | null = null;

function getRequiredEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) throw new InternalServerError(`${name} is required for Azure Blob storage.`);
    return value;
}

function getAzureBlobConfig(): AzureBlobSasConfig {
    if (config) return config;

    const rawUrl = getRequiredEnv('BLOB_SAS_URL');
    const parsedUrl = new URL(rawUrl);
    const sasTokenFromUrl = parsedUrl.search.replace(/^[?&]/, '');
    parsedUrl.search = '';

    const explicitToken = process.env.BLOB_SAS_TOKEN?.trim().replace(/^[?&]/, '') ?? '';
    const sasToken = explicitToken || sasTokenFromUrl;

    if (!sasToken) {
        throw new InternalServerError('BLOB_SAS_TOKEN is required for Azure Blob storage.');
    }

    config = {
        containerUrl: parsedUrl.toString().replace(/\/+$/, ''),
        sasToken,
    };

    return config;
}

function encodeBlobName(objectId: string): string {
    return objectId.split('/').map(encodeURIComponent).join('/');
}

function buildBlobUrl(objectId: string, extraQuery?: string): string {
    const { containerUrl, sasToken } = getAzureBlobConfig();
    const query = [sasToken, extraQuery].filter(Boolean).join('&');
    return `${containerUrl}/${encodeBlobName(objectId)}?${query}`;
}

function toUint8Array(chunk: StorageWriteChunk): Uint8Array {
    if (typeof chunk === 'string') return encoder.encode(chunk);
    if (chunk instanceof Uint8Array) return chunk;
    return new Uint8Array(chunk);
}

function concatChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
    const combined = new Uint8Array(totalBytes);
    let offset = 0;

    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return combined;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

function getAzureErrorMessage(action: string, response: Response): string {
    return `Azure Blob ${action} failed (${response.status} ${response.statusText}).`;
}

async function assertOk(response: Response, action: string): Promise<void> {
    if (response.ok) return;

    if (response.status === 404) {
        throw new NotFoundError('No file found with id');
    }

    throw new InternalServerError(getAzureErrorMessage(action, response));
}

function getRangeHeader(options?: StorageReadOptions): string | undefined {
    const range = options?.range;
    if (!range) return undefined;

    return `bytes=${range.start}-${range.end}`;
}

async function fetchBlob(objectId: string, init?: RequestInit): Promise<Response> {
    return await fetch(buildBlobUrl(objectId), {
        ...init,
        headers: {
            'x-ms-version': AZURE_STORAGE_VERSION,
            ...init?.headers,
        },
    });
}

function createBlockId(index: number): string {
    return Buffer.from(`block-${index.toString().padStart(8, '0')}`).toString('base64');
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
async function putAzureBlock(objectId: string, blockId: string, block: Uint8Array): Promise<void> {
    const response = await fetch(
        buildBlobUrl(objectId, `comp=block&blockid=${encodeURIComponent(blockId)}`),
        {
            method: 'PUT',
            headers: {
                'x-ms-version': AZURE_STORAGE_VERSION,
            },
            body: toArrayBuffer(block),
        }
    );

    await assertOk(response, 'block upload');
}

async function commitAzureBlockList(
    objectId: string,
    blockIds: string[],
    contentType: string
): Promise<void> {
    const body = `<?xml version="1.0" encoding="utf-8"?><BlockList>${blockIds
        .map((blockId) => `<Latest>${escapeXml(blockId)}</Latest>`)
        .join('')}</BlockList>`;

    const response = await fetch(buildBlobUrl(objectId, 'comp=blocklist'), {
        method: 'PUT',
        headers: {
            'x-ms-version': AZURE_STORAGE_VERSION,
            'Content-Type': 'application/xml',
            'x-ms-blob-content-type': contentType,
        },
        body,
    });

    await assertOk(response, 'block list commit');
}

function getHeaderNumber(response: Response, headerName: string): number | null {
    const rawValue = response.headers.get(headerName);
    if (!rawValue) return null;

    const value = Number(rawValue);
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

class AzureBlockBlobWriter implements StorageWriter {
    private chunks: Uint8Array[] = [];
    private bufferedBytes = 0;
    private blockIds: string[] = [];
    private blockIndex = 0;
    private closed = false;

    constructor(
        private readonly objectId: string,
        private readonly contentType: string
    ) {}

    write(chunk: StorageWriteChunk): number {
        if (this.closed) throw new Error('Cannot write to a closed Azure Blob writer.');

        const bytes = toUint8Array(chunk);
        if (bytes.byteLength === 0) return 0;

        this.chunks.push(bytes);
        this.bufferedBytes += bytes.byteLength;
        return bytes.byteLength;
    }

    async flush(): Promise<number> {
        if (this.closed) throw new Error('Cannot flush a closed Azure Blob writer.');
        if (this.bufferedBytes === 0) return 0;

        const bytes = concatChunks(this.chunks, this.bufferedBytes);
        this.chunks = [];
        this.bufferedBytes = 0;

        let uploadedBytes = 0;
        for (let offset = 0; offset < bytes.byteLength; offset += AZURE_BLOCK_SIZE) {
            const block = bytes.subarray(
                offset,
                Math.min(offset + AZURE_BLOCK_SIZE, bytes.byteLength)
            );
            await this.putBlock(block);
            uploadedBytes += block.byteLength;
        }

        return uploadedBytes;
    }

    async end(error?: Error): Promise<void> {
        if (this.closed) return;

        if (error) {
            this.closed = true;
            this.chunks = [];
            this.bufferedBytes = 0;
            return;
        }

        await this.flush();
        await this.commitBlockList();
        this.closed = true;
    }

    private async putBlock(block: Uint8Array): Promise<void> {
        const blockId = createBlockId(this.blockIndex);
        this.blockIndex += 1;

        await putAzureBlock(this.objectId, blockId, block);
        this.blockIds.push(blockId);
    }

    private async commitBlockList(): Promise<void> {
        await commitAzureBlockList(this.objectId, this.blockIds, this.contentType);
    }
}

export const azureBlobStorageService: FileStorageService = {
    upload: async (file: File, contentType?: string): Promise<string> => {
        const fileId = generateNanoId();
        const response = await fetchBlob(fileId, {
            method: 'PUT',
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': contentType || file.type || 'application/octet-stream',
            },
            body: file,
        });

        await assertOk(response, 'upload');
        return fileId;
    },

    getDownloadLink: async (objectId: string): Promise<string> => {
        const response = await fetchBlob(objectId, { method: 'HEAD' });
        await assertOk(response, 'download link lookup');
        return buildBlobUrl(objectId);
    },

    exists: async (objectId: string): Promise<boolean> => {
        const response = await fetchBlob(objectId, { method: 'HEAD' });
        if (response.status === 404) return false;
        await assertOk(response, 'existence lookup');
        return true;
    },

    getMetadata: async (objectId: string) => {
        const response = await fetchBlob(objectId, { method: 'HEAD' });
        await assertOk(response, 'metadata lookup');

        return {
            size: getHeaderNumber(response, 'content-length'),
            contentType: response.headers.get('content-type'),
        };
    },
    read: async (objectId: string): Promise<Uint8Array> => {
        const response = await fetchBlob(objectId);
        await assertOk(response, 'read');
        return new Uint8Array(await response.arrayBuffer());
    },

    stream: (objectId: string, options?: StorageReadOptions): ReadableStream<Uint8Array> => {
        return new ReadableStream<Uint8Array>({
            async start(controller) {
                try {
                    const rangeHeader = getRangeHeader(options);
                    const response = await fetchBlob(
                        objectId,
                        rangeHeader ? { headers: { Range: rangeHeader } } : undefined
                    );
                    await assertOk(response, 'stream');

                    if (!response.body) {
                        throw new InternalServerError('Azure Blob stream response has no body.');
                    }

                    const reader = response.body.getReader();
                    while (true) {
                        const result = await reader.read();
                        if (result.done) break;
                        controller.enqueue(result.value);
                    }

                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });
    },

    createWriter: (objectId: string, type = 'application/octet-stream'): StorageWriter => {
        return new AzureBlockBlobWriter(objectId, type);
    },

    stageBlock: async (objectId: string, blockIndex: number, chunk: Uint8Array): Promise<void> => {
        if (!Number.isSafeInteger(blockIndex) || blockIndex < 0) {
            throw new InternalServerError('Invalid Azure block index.');
        }

        await putAzureBlock(objectId, createBlockId(blockIndex), chunk);
    },

    commitBlockList: async (
        objectId: string,
        blockIndexes: number[],
        contentType: string
    ): Promise<void> => {
        await commitAzureBlockList(objectId, blockIndexes.map(createBlockId), contentType);
    },
    delete: async (objectId: string): Promise<void> => {
        const response = await fetchBlob(objectId, { method: 'DELETE' });
        if (response.status === 404) return;
        await assertOk(response, 'delete');
    },
};
