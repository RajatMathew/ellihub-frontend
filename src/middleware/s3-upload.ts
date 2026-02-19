import { FileUploadSchema } from '@modules/file/models';
import { s3Service } from '@modules/file/s3';
import { BadRequestError } from '@utils';
import { createMiddleware } from 'hono/factory';

export const s3Upload = createMiddleware(async (c, next) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || !(file instanceof File)) throw new BadRequestError('No file body.');

    if (!body['data'] || typeof body['data'] !== 'string')
        throw new BadRequestError('No file info provided.');

    const request = FileUploadSchema.parse(JSON.parse(body['data']));
    const key = await s3Service.upload(file);

    c.set('fileId', key);
    c.set('fileData', { ...request, mimeType: file.type, size: file.size });

    await next();
});
