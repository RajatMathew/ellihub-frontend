import { assertFileCreateAccess } from '@lib/access';
import { prisma } from '@lib/prisma';
import { FileUploadSchema } from '@modules/file/models';
import { storageService } from '@modules/file/storage';
import { validateUploadedFile } from '@modules/file/validation';
import { BadRequestError, ConflictError } from '@utils';
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

    if (validated.request.parentId) {
        const name = validated.request.name.trim();
        if (!name) throw new BadRequestError('Name is required.');

        const existing = await prisma.file.findFirst({
            where: {
                parentId: validated.request.parentId,
                deletedAt: null,
                name: { equals: name, mode: 'insensitive' },
            },
            select: { id: true },
        });

        if (existing) {
            throw new ConflictError(`A file or folder named "${name}" already exists here.`);
        }
    }

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
