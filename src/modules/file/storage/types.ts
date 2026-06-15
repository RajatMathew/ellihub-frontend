export type StorageWriteChunk = Uint8Array | string | ArrayBuffer | SharedArrayBuffer;

export type StorageWriter = {
    write: (chunk: StorageWriteChunk) => number;
    flush: () => number | Promise<number>;
    end: (error?: Error) => void | Promise<void>;
};

export type FileStorageService = {
    upload: (file: File, contentType?: string) => Promise<string>;
    getDownloadLink: (objectId: string, expiresIn?: number) => Promise<string>;
    exists: (objectId: string) => Promise<boolean>;
    read: (objectId: string) => Promise<Uint8Array>;
    stream: (objectId: string) => ReadableStream<Uint8Array>;
    createWriter: (objectId: string, type?: string) => StorageWriter;
    delete: (objectId: string) => Promise<void>;
};
