export type StorageWriteChunk = Uint8Array | string | ArrayBuffer | SharedArrayBuffer;

export type StorageReadRange = {
    start: number;
    end: number;
};

export type StorageReadOptions = {
    range?: StorageReadRange;
};

export type StorageObjectMetadata = {
    size: number | null;
    contentType: string | null;
};

export type StorageWriter = {
    write: (chunk: StorageWriteChunk) => number | Promise<number>;
    flush: () => number | Promise<number>;
    end: (error?: Error) => void | Promise<void>;
};

export type FileStorageService = {
    upload: (file: File, contentType?: string) => Promise<string>;
    getDownloadLink: (objectId: string, expiresIn?: number) => Promise<string>;
    exists: (objectId: string) => Promise<boolean>;
    getMetadata?: (objectId: string) => Promise<StorageObjectMetadata>;
    read: (objectId: string) => Promise<Uint8Array>;
    stream: (objectId: string, options?: StorageReadOptions) => ReadableStream<Uint8Array>;
    createWriter: (objectId: string, type?: string) => StorageWriter;
    stageBlock?: (objectId: string, blockIndex: number, chunk: Uint8Array) => Promise<void>;
    commitBlockList?: (
        objectId: string,
        blockIndexes: number[],
        contentType: string
    ) => Promise<void>;
    delete: (objectId: string) => Promise<void>;
};
