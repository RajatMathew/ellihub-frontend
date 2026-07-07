import { assertFileCreateAccess } from '@lib/access';
import { FileUploadSchema } from '@modules/file/models';
import { storageService } from '@modules/file/storage';
import { validateUploadedFile } from '@modules/file/validation';
import { BadRequestError } from '@utils';
import { createMiddleware } from 'hono/factory';

export const storageUpload = createMiddleware(async (c, next) => {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || !(file instanceof File)) throw new BadRequestError('No file body.');

    if (!body['data'] || typeof body['data'] !== 'string')
        throw new BadRequestError('No file info provided.');

    const request = FileUploadSchema.parse(JSON.parse(body['data']));
    const validated = await validateUploadedFile(file, request);
    await assertFileCreateAccess(c, request.parentId);

    const key = await storageService.upload(file, validated.detectedMimeType);

    c.set('fileId', key);
    c.set('fileData', validated.request);

    try {
        await next();
    } catch (error) {
        await storageService.delete(key).catch(() => undefined);
        throw error;
    }
});
