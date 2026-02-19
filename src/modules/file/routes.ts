import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { s3Upload } from 'src/middleware/s3-upload';

import { FolderCreateSchema } from './models';
import { s3Service } from './s3';
import { FileService } from './services';

export const app = new Hono();

app.post('/upload', s3Upload, async (c) => {
    console.log(c.get('fileId'));

    await FileService.uploadFile(c.get('fileData')!, c.get('fileId')!, c.get('user')!.id);

    return success(c, '');
});

app.get('/download/:id', async (c) => {
    const link = await s3Service.getDownloadLink(c.req.param('id'));

    return success(c, link);
});

app.get('/root', async (c) => {
    const rootFolderId = await FileService.getRootFolder('root');

    return success(c, rootFolderId);
});

app.post(
    '/folder',
    // requirePermission({ file: ['create'] }),
    zValidator('json', FolderCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const folder = await FileService.createFolder(data, c.get('user')!.id);
        return success(c, folder, 201);
    }
);

export default app;
