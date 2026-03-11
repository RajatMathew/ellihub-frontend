import { success, zValidator } from '@utils';
import { Hono } from 'hono';
import { s3Upload } from 'src/middleware/s3-upload';

import { FileFolderRenameSchema, FolderCreateSchema } from './models';
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

app.put(
    '/rename',
    // requirePermission({ file: ['create'] }),
    zValidator('json', FileFolderRenameSchema),
    async (c) => {
        const data = c.req.valid('json');
        const folder = await FileService.rename(data);
        return success(c, folder);
    }
);

app.get('/folder/:id/breadcrumbs', async (c) => {
    const breadcrumbs = await FileService.getBreadcrumbs(c.req.param('id'));

    return success(c, breadcrumbs);
});

app.get('/folder/:id', async (c) => {
    const id = c.req.param('id');
    const folder = await FileService.getFolderDetails(id);

    return success(c, folder);
});

app.delete('/folder/:id', async (c) => {
    const id = c.req.param('id');
    const folder = await FileService.deleteFolder(id, c.get('user')!.id);

    return success(c, folder);
});

app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const file = await FileService.deleteFile(id, c.get('user')!.id);

    return success(c, file);
});

app.get('/project/:projectId/folder', async (c) => {
    const folderId = await FileService.getProjectFolderId(c.req.param('projectId'));

    return success(c, folderId);
});

app.get('/project/:projectId/folder/:type', async (c) => {
    const folderId = await FileService.getProjectSubFolderId(
        c.req.param('projectId'),
        c.req.param('type') as Parameters<typeof FileService.getProjectSubFolderId>[1]
    );

    return success(c, folderId);
});

export default app;
