import { InternalServerError, NotFoundError } from '@utils';
import { S3Client, type NetworkSink } from 'bun';
import { ulid } from 'ulid';

const s3Client = new S3Client({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
});

export const s3Service = {
    upload: async (file: File): Promise<string> => {
        try {
            const fileId = ulid();
            await s3Client.write(fileId, file, {
                type: file.type,
            });

            return fileId;
        } catch (e) {
            console.log(e);

            throw new InternalServerError('Could not upload file.');
        }
    },

    getDownloadLink: async (fileId: string, expiresIn = 60 * 60): Promise<string> => {
        const file = await s3Client.file(fileId);

        if (!file) throw new NotFoundError('No file found with id ' + fileId);

        return s3Client.presign(fileId, { expiresIn });
    },

    read: async (fileId: string): Promise<Uint8Array> => {
        try {
            const file = await s3Client.file(fileId);

            if (!file) throw new NotFoundError('No file found with id ' + fileId);

            return new Uint8Array(await file.arrayBuffer());
        } catch (e) {
            console.log(e);

            throw new NotFoundError('No file found with id ' + fileId);
        }
    },

    stream: (fileId: string): ReadableStream<Uint8Array> => {
        return s3Client.file(fileId).stream();
    },

    createWriter: (fileId: string, type = 'application/octet-stream'): NetworkSink => {
        return s3Client.file(fileId).writer({
            type,
            partSize: 10 * 1024 * 1024,
            queueSize: 3,
        });
    },

    delete: async (fileId: string): Promise<void> => {
        try {
            await s3Client.delete(fileId);
        } catch (e) {
            console.log(e);

            throw new InternalServerError('Could not delete file with id: ' + fileId);
        }
    },
};
