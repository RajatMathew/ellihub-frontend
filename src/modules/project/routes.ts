import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    PrimeContractUpsertSchema,
    ProjectCreateSchema,
    ProjectUpdateSchema,
    ScheduleEntryCreateSchema,
    ScheduleEntryUpdateSchema,
    TeamMemberSchema,
} from './models';
import { ProjectService } from './services';

const app = new Hono();

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const query = c.req.query();

        const { statusId, division, stageId, gcId, leadPMId, year } = query;
        pagination.filter = {
            ...pagination.filter,
            ...(statusId && { statusId }),
            ...(division && { division }),
            ...(stageId && { stageId }),
            ...(gcId && { gcId }),
            ...(leadPMId && { leadPMId }),
            ...(year && { year }),
        };

        const { data, count } = await ProjectService.listProjects(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/',
    requirePermission({ project: ['create'] }),
    zValidator('json', ProjectCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const userId = c.get('user')!.id;
        const project = await ProjectService.createProject(data, userId);
        return success(c, project, 201);
    }
);

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const project = await ProjectService.getProject(id);
    return success(c, project);
});

app.put(
    '/:id',
    requirePermission({ project: ['update'] }),
    zValidator('json', ProjectUpdateSchema),
    async (c) => {
        const id = c.req.param('id');
        const data = c.req.valid('json');
        const project = await ProjectService.updateProject(id, data);
        return success(c, project);
    }
);

app.delete('/:id', requirePermission({ project: ['delete'] }), async (c) => {
    const id = c.req.param('id');
    await ProjectService.deleteProject(id);
    return success(c, null, 200, 'Project deleted');
});

// Prime Contract sub-resource
app.get('/:id/contract', requirePermission({ project: ['view-all'] }), async (c) => {
    const projectId = c.req.param('id');
    const contract = await ProjectService.getPrimeContract(projectId);
    return success(c, contract);
});

app.put(
    '/:id/contract',
    requirePermission({ project: ['update'] }),
    zValidator('json', PrimeContractUpsertSchema),
    async (c) => {
        const projectId = c.req.param('id');
        const data = c.req.valid('json');
        const contract = await ProjectService.upsertPrimeContract(projectId, data);
        return success(c, contract);
    }
);

// Schedule entries sub-resource
app.get(
    '/:id/schedule',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({ defaultSize: 50, defaultSortBy: 'date', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const projectId = c.req.param('id');
        const pagination = c.get('pagination');
        const { data, count } = await ProjectService.listScheduleEntries(projectId, pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.post(
    '/:id/schedule',
    requirePermission({ project: ['update'] }),
    zValidator('json', ScheduleEntryCreateSchema),
    async (c) => {
        const projectId = c.req.param('id');
        const data = c.req.valid('json');
        const entry = await ProjectService.createScheduleEntry(projectId, data);
        return success(c, entry, 201);
    }
);

app.put(
    '/:id/schedule/:entryId',
    requirePermission({ project: ['update'] }),
    zValidator('json', ScheduleEntryUpdateSchema),
    async (c) => {
        const projectId = c.req.param('id');
        const entryId = c.req.param('entryId');
        const data = c.req.valid('json');
        const entry = await ProjectService.updateScheduleEntry(projectId, entryId, data);
        return success(c, entry);
    }
);

app.delete('/:id/schedule/:entryId', requirePermission({ project: ['update'] }), async (c) => {
    const projectId = c.req.param('id');
    const entryId = c.req.param('entryId');
    await ProjectService.deleteScheduleEntry(projectId, entryId);
    return success(c, null, 200, 'Schedule entry deleted');
});

// Team management sub-resource
app.get('/:id/team', requirePermission({ project: ['view-all'] }), async (c) => {
    const projectId = c.req.param('id');
    const team = await ProjectService.getTeam(projectId);
    return success(c, team);
});

app.post(
    '/:id/team',
    requirePermission({ project: ['update'] }),
    zValidator('json', TeamMemberSchema),
    async (c) => {
        const projectId = c.req.param('id');
        const data = c.req.valid('json');
        const member = await ProjectService.addTeamMember(projectId, data);
        return success(c, member, 201);
    }
);

app.put('/:id/team/:employeeId/promote', requirePermission({ project: ['update'] }), async (c) => {
    const projectId = c.req.param('id');
    const employeeId = c.req.param('employeeId');
    const keepOldPM = c.req.query('keepOldPM') !== 'false';
    const result = await ProjectService.promoteTeamMember(projectId, employeeId, keepOldPM);
    return success(c, result);
});

app.delete('/:id/team/:employeeId', requirePermission({ project: ['update'] }), async (c) => {
    const projectId = c.req.param('id');
    const employeeId = c.req.param('employeeId');
    await ProjectService.removeTeamMember(projectId, employeeId);
    return success(c, null, 200, 'Team member removed');
});

export default app;
