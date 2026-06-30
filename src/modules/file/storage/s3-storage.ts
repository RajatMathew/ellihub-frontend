import { InternalServerError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { S3Client, type NetworkSink } from 'bun';

import type { FileStorageService, StorageReadOptions, StorageWriter } from './types';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
    s3Client ??= new S3Client({
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION,
        endpoint: process.env.S3_ENDPOINT,
    });

    return s3Client;
}

export const s3StorageService: FileStorageService = {
    upload: async (file: File, contentType?: string): Promise<string> => {
        try {
            const fileId = generateNanoId();
            await getS3Client().write(fileId, file, {
                type: contentType || file.type,
            });

            return fileId;
        } catch (e) {
            console.log(e);

            throw new InternalServerError('Could not upload file.');
        }
    },

    getDownloadLink: async (fileId: string, expiresIn = 60 * 60): Promise<string> => {
        const file = await getS3Client().file(fileId);

        if (!file) throw new NotFoundError('No file found with id ' + fileId);

        return getS3Client().presign(fileId, { expiresIn });
    },

    exists: async (fileId: string): Promise<boolean> => {
        try {
            return await getS3Client().file(fileId).exists();
        } catch {
            return false;
        }
    },

    read: async (fileId: string): Promise<Uint8Array> => {
        try {
            const file = await getS3Client().file(fileId);

            if (!file) throw new NotFoundError('No file found with id ' + fileId);

            return new Uint8Array(await file.arrayBuffer());
        } catch (e) {
            console.log(e);

            throw new NotFoundError('No file found with id ' + fileId);
        }
    },

    stream: (fileId: string, options?: StorageReadOptions): ReadableStream<Uint8Array> => {
        const file = getS3Client().file(fileId);

        if (options?.range) {
            return (file as unknown as Blob)
                .slice(options.range.start, options.range.end + 1)
                .stream() as ReadableStream<Uint8Array>;
        }

        return file.stream();
    },

    createWriter: (fileId: string, type = 'application/octet-stream'): StorageWriter => {
        const writer = getS3Client()
            .file(fileId)
            .writer({
                type,
                partSize: 10 * 1024 * 1024,
                queueSize: 3,
            }) as NetworkSink;

        return {
            write: (chunk) => writer.write(chunk),
            flush: () => writer.flush(),
            end: async (error?: Error) => {
                await writer.end(error);
            },
        };
    },

    delete: async (fileId: string): Promise<void> => {
        try {
            await getS3Client().delete(fileId);
        } catch (e) {
            console.log(e);

            throw new InternalServerError('Could not delete file with id: ' + fileId);
        }
    },
};
