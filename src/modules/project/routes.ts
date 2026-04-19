import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requirePermission } from 'src/middleware/auth';

import {
    AddPrimeContractSchema,
    AddTeamMemberSchema,
    ProjectCreateSchema,
    ProjectUpdateSchema,
    RemoveTeamMemberSchema,
} from './models';
import { ProjectService } from './service';

const app = new Hono();

app.get(
    '/',
    requirePermission({ project: ['view-all'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const { data, count } = await ProjectService.getProjects(pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get(
    '/assigned/:employeeId',
    requirePermission({ project: ['view-assigned-projects'] }),
    paginationMiddleware({ defaultSize: 25, defaultSortBy: 'createdAt', defaultSortOrder: 'desc' }),
    async (c: Context) => {
        const employeeId = c.req.param('employeeId');
        const pagination = c.get('pagination');
        const { data, count } = await ProjectService.getAssignedProjects(employeeId, pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get('/:id', requirePermission({ project: ['view-all'] }), async (c) => {
    const id = c.req.param('id');
    const project = await ProjectService.getProject(id);
    return success(c, project);
});

app.post(
    '/',
    requirePermission({ project: ['create'] }),
    zValidator('json', ProjectCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const project = await ProjectService.createProject(data, c.get('user')!.id);
        return success(c, project, 201);
    }
);

app.put(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', ProjectUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const project = await ProjectService.updateProject(data, c.get('user')!.id);
        return success(c, project);
    }
);

app.patch(
    '/team-member/add',
    requirePermission({ project: ['update'] }),
    zValidator('json', AddTeamMemberSchema),
    async (c) => {
        const data = c.req.valid('json');
        const member = await ProjectService.addTeamMember(data, c.get('user')!.id);
        return success(c, member);
    }
);

app.patch(
    '/team-member/remove',
    requirePermission({ project: ['update'] }),
    zValidator('json', RemoveTeamMemberSchema),
    async (c) => {
        const data = c.req.valid('json');
        await ProjectService.removeTeamMember(data, c.get('user')!.id);
        return success(c, null);
    }
);

app.patch(
    '/prime-contract/add',
    requirePermission({ project: ['update'] }),
    zValidator('json', AddPrimeContractSchema),
    async (c) => {
        const data = c.req.valid('json');
        const primeContract = await ProjectService.addPrimeContract(data, c.get('user')!.id);
        return success(c, primeContract);
    }
);

app.patch('/:id/set-active', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const project = await ProjectService.setActive(id, c.get('user')!.id);
    return success(c, project);
});

app.patch('/:id/set-inactive', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const project = await ProjectService.setInactive(id, c.get('user')!.id);
    return success(c, project);
});

app.patch('/:id/set-closed', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const project = await ProjectService.setClosed(id, c.get('user')!.id);
    return success(c, project);
});

app.patch('/:id/set-completed', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    const project = await ProjectService.setCompleted(id, c.get('user')!.id);
    return success(c, project);
});

export default app;
