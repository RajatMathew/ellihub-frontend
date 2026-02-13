import { InternalServerError, NotFoundError } from '@utils';
import { S3Client } from 'bun';
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

    download: async (fileId: string) => {
        const file = await s3Client.file(fileId);

        if (!file) throw new NotFoundError('No file found with id ' + fileId);

        return file;
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
