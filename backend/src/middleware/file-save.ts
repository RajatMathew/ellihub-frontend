import { FileService } from '@modules/file/services';
import { BadRequestError } from '@utils';
import { createMiddleware } from 'hono/factory';

export const fileSave = createMiddleware(async (c, next) => {
    const fileId = c.get('fileId');
    const fileData = c.get('fileData');
    const userId = c.get('user')?.id;

    if (!fileId || !fileData || !userId)
        throw new BadRequestError('No file or user info provided.');

    await FileService.uploadFile(fileData, fileId, userId);

    await next();
});
