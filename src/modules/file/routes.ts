import { success } from '@utils';
import { Hono } from 'hono';
import { fileMiddleware } from 'src/middleware/file';

import { s3Service } from './s3';
import { FileService } from './services';

export const app = new Hono();

app.post('/upload', fileMiddleware, async (c) => {
    console.log(c.get('fileId'));

    await FileService.uploadFile(c.get('fileData')!, c.get('fileId')!, c.get('user')!.id);

    return success(c, '');
});

app.get('/download/:id', async (c) => {
    const link = await s3Service.getDownloadLink(c.req.param('id'));

    return success(c, link);
});

export default app;
