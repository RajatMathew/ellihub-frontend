import {
    assertFileAccess,
    assertFileCreateAccess,
    assertProjectAccess,
    getAccessContext,
} from '@lib/access';
import { paginationMiddleware } from '@middleware/pagination';
import { ForbiddenError, success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requireAdminMiddleware, requirePermission } from 'src/middleware/auth';
import { storageUpload } from 'src/middleware/storage-upload';

import { FileFolderRenameSchema, FolderCreateSchema, ProjectEntityFolderSchema } from './models';
import { FileService } from './services';

export const app = new Hono();

function getContentDisposition(disposition: 'inline' | 'attachment', fileName: string): string {
    const fallbackName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

app.get(
    '/search',
    requirePermission({ file: ['read'] }),
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
        const access = await getAccessContext(c);
        const scopedFolderId = ancestorId || parentId;

        if (!access.isAdmin) {
            if (!scopedFolderId) {
                throw new ForbiddenError('Global file search is restricted');
            }
            await assertFileAccess(c, scopedFolderId);
        }

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

app.post('/upload', requirePermission({ file: ['create'] }), storageUpload, async (c) => {
    const fileData = c.get('fileData')!;

    if (!fileData.parentId) {
        fileData.parentId = await FileService.getTempFolderId();
    }

    await assertFileCreateAccess(c, fileData.parentId);
    await FileService.uploadFile(fileData, c.get('fileId')!, c.get('user')!.id);

    return success(c, '');
});

app.get('/download/:id', requirePermission({ file: ['download'] }), async (c) => {
    const id = c.req.param('id');
    await FileService.ensureFileAvailable(id);
    await assertFileAccess(c, id);
    const link = await FileService.getDownloadLink(id);

    return success(c, link);
});

app.get('/read/:id', requirePermission({ file: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await FileService.ensureFileAvailable(id);
    await assertFileAccess(c, id);
    const file = await FileService.getFileStream(id);
    const disposition =
        c.req.query('disposition') === 'attachment' || c.req.query('download') === 'true'
            ? 'attachment'
            : 'inline';
    const headers = new Headers({
        'Content-Type': file.mimeType,
        'Content-Disposition': getContentDisposition(disposition, file.fileName),
        'Cache-Control': 'private, max-age=300',
    });

    if (file.size !== null) {
        headers.set('Content-Length', String(file.size));
    }

    return new Response(file.stream, {
        status: 200,
        headers,
    });
});

app.get('/root', requireAdminMiddleware, async (c) => {
    const rootFolderId = await FileService.getRootFolder('root');

    return success(c, rootFolderId);
});

app.post(
    '/folder',
    requirePermission({ file: ['create'] }),
    zValidator('json', FolderCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertFileCreateAccess(c, data.parentId);
        const folder = await FileService.createFolder(data, c.get('user')!.id);
        return success(c, folder, 201);
    }
);

app.put(
    '/rename',
    requirePermission({ file: ['update'] }),
    zValidator('json', FileFolderRenameSchema),
    async (c) => {
        const data = c.req.valid('json');
        const folder = await FileService.rename(data, c.get('user')!.id);
        return success(c, folder);
    }
);

app.post('/folder/:id/export', requirePermission({ file: ['export'] }), async (c) => {
    const id = c.req.param('id');
    await assertFileAccess(c, id);
    const job = await FileService.createFolderExportJob(id, c.get('user')!.id);

    return success(c, job, 202);
});

app.get('/export/:id', requirePermission({ file: ['export'] }), async (c) => {
    const job = await FileService.getFolderExportJob(c.req.param('id'), c.get('user')!.id);

    return success(c, job);
});

app.get('/folder/:id/breadcrumbs', requirePermission({ file: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await assertFileAccess(c, id);
    const breadcrumbs = await FileService.getBreadcrumbs(id);

    return success(c, breadcrumbs);
});

app.get('/folder/:id', requirePermission({ file: ['read'] }), async (c) => {
    const id = c.req.param('id');
    await assertFileAccess(c, id);
    const folder = await FileService.getFolderDetails(id);

    return success(c, folder);
});

app.delete('/folder/:id', requirePermission({ file: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    const folder = await FileService.deleteFolder(id, c.get('user')!.id);

    return success(c, folder);
});

app.delete('/:id', requirePermission({ file: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    const file = await FileService.deleteFile(id, c.get('user')!.id);

    return success(c, file);
});

app.get('/project/:projectId/folder', requirePermission({ file: ['read'] }), async (c) => {
    const projectId = c.req.param('projectId');
    await assertProjectAccess(c, projectId);
    const folderId = await FileService.getProjectFolderId(projectId);

    return success(c, folderId);
});

app.post(
    '/project/:projectId/entity-folder',
    requirePermission({ file: ['create'] }),
    zValidator('json', ProjectEntityFolderSchema),
    async (c) => {
        const projectId = c.req.param('projectId');
        await assertProjectAccess(c, projectId);
        const data = c.req.valid('json');
        const folderId = await FileService.getOrCreateProjectEntityFolder(
            { projectId, ...data },
            c.get('user')!.id
        );

        return success(c, folderId);
    }
);

app.get('/project/:projectId/folder/:type', requirePermission({ file: ['read'] }), async (c) => {
    const projectId = c.req.param('projectId');
    await assertProjectAccess(c, projectId);
    const folderId = await FileService.getProjectSubFolderId(
        projectId,
        c.req.param('type') as Parameters<typeof FileService.getProjectSubFolderId>[1]
    );

    return success(c, folderId);
});

export default app;
