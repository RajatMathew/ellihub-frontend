import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { s3Upload } from 'src/middleware/s3-upload';

import { FileFolderRenameSchema, FolderCreateSchema } from './models';
import { s3Service } from './s3';
import { FileService } from './services';

export const app = new Hono();

function getContentDisposition(disposition: 'inline' | 'attachment', fileName: string): string {
    const fallbackName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function getResponseBody(content: Uint8Array): ArrayBuffer {
    return content.slice().buffer;
}

app.get(
    '/search',
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'createdAt',
        defaultSortOrder: 'desc',
        allowedSortFields: ['name', 'size', 'createdAt', 'updatedAt', 'type', 'mimeType'],
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { type, mimeType, parentId, ancestorId, createdBy, createdFrom, createdTo } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(type && { type }),
            ...(mimeType && { mimeType }),
            ...(parentId && { parentId }),
            ...(ancestorId && { ancestorId }),
            ...(createdBy && { createdBy }),
            ...(createdFrom && { createdFrom }),
            ...(createdTo && { createdTo }),
        };

        const { data, count } = await FileService.searchFiles(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post('/upload', s3Upload, async (c) => {
    const fileData = c.get('fileData')!;

    if (!fileData.parentId) {
        fileData.parentId = await FileService.getTempFolderId();
    }

    await FileService.uploadFile(fileData, c.get('fileId')!, c.get('user')!.id);

    return success(c, '');
});

app.get('/download/:id', async (c) => {
    const link = await s3Service.getDownloadLink(c.req.param('id'));

    return success(c, link);
});

app.get('/read/:id', async (c) => {
    const file = await FileService.getFileContent(c.req.param('id'));
    const disposition =
        c.req.query('disposition') === 'attachment' || c.req.query('download') === 'true'
            ? 'attachment'
            : 'inline';

    return new Response(getResponseBody(file.content), {
        status: 200,
        headers: {
            'Content-Type': file.mimeType,
            'Content-Length': String(file.content.byteLength),
            'Content-Disposition': getContentDisposition(disposition, file.fileName),
            'Cache-Control': 'private, max-age=300',
        },
    });
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
        const folder = await FileService.rename(data, c.get('user')!.id);
        return success(c, folder);
    }
);

app.post('/folder/:id/export', async (c) => {
    const job = await FileService.createFolderExportJob(c.req.param('id'), c.get('user')!.id);

    return success(c, job, 202);
});

app.get('/export/:id', async (c) => {
    const job = await FileService.getFolderExportJob(c.req.param('id'), c.get('user')!.id);

    return success(c, job);
});

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
