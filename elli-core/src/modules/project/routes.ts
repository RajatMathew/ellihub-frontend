import {
    assertEmployeeSelfOrAdmin,
    assertProjectActionAccess,
    assertProjectAccess,
    assertProjectManagementAccess,
    assertProjectScheduleManagementAccess,
    canManageProject,
    getCurrentProjectTeamRole,
    getAccessContext,
    getProjectActionCapabilities,
} from '@lib/access';
import { paginationMiddleware } from '@middleware';
import { success, zValidator } from '@utils';
import { Context, Hono } from 'hono';
import { requireAnyPermission, requirePermission } from 'src/middleware/auth';

import {
    AddPrimeContractSchema,
    AddScheduleSchema,
    AddTeamMemberSchema,
    PinPrimeContractsSchema,
    PrimeContractAttachmentParamsSchema,
    PromoteTeamMemberSchema,
    ProjectCreateSchema,
    ProjectUpdateSchema,
    RemoveScheduleSchema,
    RemoveTeamMemberSchema,
    SetPrimeContractPrimarySchema,
    UnpinPrimeContractsSchema,
    UpdateTeamMemberRoleSchema,
    UpdateScheduleSchema,
} from './models';
import { ProjectService } from './service';

const app = new Hono();

const projectSortFields = [
    'name',
    'jobNumber',
    'estimatedStartDate',
    'estimatedEndDate',
    'tcoDate',
    'createdAt',
    'updatedAt',
];

app.get(
    '/',
    requireAnyPermission([{ project: ['view-all'] }, { project: ['view-assigned-projects'] }]),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'tcoDate',
        defaultSortOrder: 'desc',
        allowedSortFields: projectSortFields,
    }),
    async (c: Context) => {
        const pagination = c.get('pagination');
        const access = await getAccessContext(c);
        const { data, count } = await ProjectService.getProjects(pagination, access);
        return success(c, data, 200, 'OK', count);
    }
);

app.get(
    '/assigned/:employeeId',
    requirePermission({ project: ['view-assigned-projects'] }),
    paginationMiddleware({
        defaultSize: 25,
        defaultSortBy: 'tcoDate',
        defaultSortOrder: 'desc',
        allowedSortFields: projectSortFields,
    }),
    async (c: Context) => {
        const employeeId = c.req.param('employeeId');
        await assertEmployeeSelfOrAdmin(c, employeeId);
        const pagination = c.get('pagination');
        const { data, count } = await ProjectService.getAssignedProjects(employeeId, pagination);
        return success(c, data, 200, 'OK', count);
    }
);

app.get(
    '/schedule/:projectId',
    requireAnyPermission([{ project: ['view-all'] }, { project: ['view-assigned-projects'] }]),
    async (c: Context) => {
        const projectId = c.req.param('projectId');
        await assertProjectAccess(c, projectId);
        const schedules = await ProjectService.getProjectSchedules(projectId);
        return success(c, schedules);
    }
);

app.get('/prime-contract/:projectId', requirePermission({ primeContract: ['read'] }), async (c) => {
    const projectId = c.req.param('projectId');
    await assertProjectActionAccess(c, 'primeContract', 'read', projectId);
    const primeContracts = await ProjectService.getProjectPrimeContracts(projectId);
    return success(c, primeContracts);
});

app.get(
    '/:projectId/prime-contract/pinned',
    requirePermission({ primeContract: ['read'] }),
    async (c) => {
        const projectId = c.req.param('projectId');
        await assertProjectActionAccess(c, 'primeContract', 'read', projectId);
        const primeContracts = await ProjectService.getProjectPrimeContracts(projectId);
        return success(c, primeContracts);
    }
);

app.get(
    '/:projectId/prime-contract/candidates',
    requirePermission({ primeContract: ['read'] }),
    async (c) => {
        const projectId = c.req.param('projectId');
        await assertProjectActionAccess(c, 'primeContract', 'read', projectId);
        const candidates = await ProjectService.getProjectPrimeContractCandidates(projectId);
        return success(c, candidates);
    }
);

app.get(
    '/fieldwire/projects',
    requirePermission({ primeChangeOrder: ['fieldwire-projects'] }),
    async (c) => {
        const projects = await ProjectService.getFieldwireProjects();
        return success(c, projects);
    }
);

app.get(
    '/:id/cost-codes',
    requireAnyPermission([{ project: ['view-all'] }, { project: ['view-assigned-projects'] }]),
    async (c) => {
        const projectId = c.req.param('id');
        await assertProjectAccess(c, projectId);
        const costCodes = await ProjectService.getProjectCostCodes();
        return success(c, costCodes);
    }
);

app.get('/:id/employee-options', requirePermission({ projectTeam: ['add'] }), async (c) => {
    const projectId = c.req.param('id');
    await assertProjectActionAccess(c, 'projectTeam', 'add', projectId);
    const employees = await ProjectService.getProjectEmployeeOptions();
    return success(c, employees);
});

app.get(
    '/:id',
    requireAnyPermission([{ project: ['view-all'] }, { project: ['view-assigned-projects'] }]),
    async (c) => {
        const id = c.req.param('id');
        const access = await assertProjectAccess(c, id);
        const project = await ProjectService.getProject(id);
        const canManage = await canManageProject(access, id);
        const currentProjectRole = await getCurrentProjectTeamRole(access, id);
        const actions = await getProjectActionCapabilities(access, id);
        return success(c, {
            ...project,
            currentUserProjectRole: currentProjectRole ?? access.role,
            capabilities: {
                canManage,
                canEdit: canManage,
                canCreateProjectDocuments: canManage,
                canManageTeam: canManage,
                actions,
            },
        });
    }
);

app.post(
    '/',
    requirePermission({ project: ['create'] }),
    zValidator('json', ProjectCreateSchema),
    async (c) => {
        const data = c.req.valid('json');
        const access = await getAccessContext(c);
        const project = await ProjectService.createProject(data, c.get('user')!.id, access);
        return success(c, project, 201);
    }
);

app.put(
    '/',
    requirePermission({ project: ['update'] }),
    zValidator('json', ProjectUpdateSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectManagementAccess(c, data.id);
        const project = await ProjectService.updateProject(data, c.get('user')!.id);
        return success(c, project);
    }
);

app.patch(
    '/schedule/add',
    requirePermission({ project: ['update'] }),
    zValidator('json', AddScheduleSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectManagementAccess(c, data.projectId);
        const schedule = await ProjectService.addSchedule(data, c.get('user')!.id);
        return success(c, schedule);
    }
);

app.patch(
    '/schedule/update',
    requirePermission({ project: ['update'] }),
    zValidator('json', UpdateScheduleSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectScheduleManagementAccess(c, data.id);
        const schedule = await ProjectService.updateSchedule(data, c.get('user')!.id);
        return success(c, schedule);
    }
);

app.patch(
    '/schedule/remove',
    requirePermission({ project: ['update'] }),
    zValidator('json', RemoveScheduleSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectScheduleManagementAccess(c, data.id);
        await ProjectService.removeSchedule(data, c.get('user')!.id);
        return success(c, null);
    }
);

app.patch(
    '/team-member/add',
    requirePermission({ projectTeam: ['add'] }),
    zValidator('json', AddTeamMemberSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectActionAccess(c, 'projectTeam', 'add', data.projectId);
        const member = await ProjectService.addTeamMember(data, c.get('user')!.id);
        return success(c, member);
    }
);

app.patch(
    '/team-member/remove',
    requirePermission({ projectTeam: ['remove'] }),
    zValidator('json', RemoveTeamMemberSchema),
    async (c) => {
        const data = c.req.valid('json');
        const access = await assertProjectActionAccess(c, 'projectTeam', 'remove', data.projectId);
        await ProjectService.removeTeamMember(data, c.get('user')!.id, access);
        return success(c, null);
    }
);

app.patch(
    '/:projectId/team/:employeeId/role',
    requireAnyPermission([{ projectTeam: ['assign-role'] }, { projectTeam: ['transfer-lead'] }]),
    zValidator('json', UpdateTeamMemberRoleSchema.omit({ projectId: true, employeeId: true })),
    async (c) => {
        const body = c.req.valid('json');
        const data = UpdateTeamMemberRoleSchema.parse({
            projectId: c.req.param('projectId'),
            employeeId: c.req.param('employeeId'),
            ...body,
        });
        await assertProjectActionAccess(
            c,
            'projectTeam',
            data.role === 'Lead PM' ? 'transfer-lead' : 'assign-role',
            data.projectId
        );
        const member = await ProjectService.updateTeamMemberRole(data, c.get('user')!.id);
        return success(c, member);
    }
);

app.put(
    '/:projectId/team/:employeeId/promote',
    requirePermission({ projectTeam: ['promote'] }),
    async (c) => {
        const data = PromoteTeamMemberSchema.parse({
            projectId: c.req.param('projectId'),
            employeeId: c.req.param('employeeId'),
        });
        await assertProjectActionAccess(c, 'projectTeam', 'promote', data.projectId);
        const member = await ProjectService.promoteTeamMember(data, c.get('user')!.id);
        return success(c, member);
    }
);

app.patch(
    '/prime-contract/add',
    requirePermission({ primeContract: ['pin'] }),
    zValidator('json', AddPrimeContractSchema),
    async (c) => {
        const data = c.req.valid('json');
        await assertProjectActionAccess(c, 'primeContract', 'pin', data.projectId);
        const primeContract = await ProjectService.addPrimeContract(data, c.get('user')!.id);
        return success(c, primeContract);
    }
);

app.patch(
    '/:projectId/prime-contract/pin',
    requirePermission({ primeContract: ['pin'] }),
    zValidator('json', PinPrimeContractsSchema),
    async (c) => {
        const data = c.req.valid('json');
        const projectId = c.req.param('projectId');
        const request = { ...data, projectId };
        await assertProjectActionAccess(c, 'primeContract', 'pin', projectId);
        const primeContracts = await ProjectService.pinPrimeContracts(request, c.get('user')!.id);
        return success(c, primeContracts);
    }
);

app.patch(
    '/:projectId/contract/attachments/:attachmentId/primary',
    requirePermission({ primeContract: ['primary'] }),
    async (c) => {
        const data = PrimeContractAttachmentParamsSchema.parse({
            projectId: c.req.param('projectId'),
            primeContractId: c.req.param('attachmentId'),
        });
        await assertProjectActionAccess(c, 'primeContract', 'primary', data.projectId);
        const primeContract = await ProjectService.setPrimaryPrimeContract(data, c.get('user')!.id);
        return success(c, primeContract);
    }
);

app.patch(
    '/:projectId/prime-contract/primary',
    requirePermission({ primeContract: ['primary'] }),
    zValidator('json', SetPrimeContractPrimarySchema),
    async (c) => {
        const data = c.req.valid('json');
        const projectId = c.req.param('projectId');
        const request = { ...data, projectId };
        await assertProjectActionAccess(c, 'primeContract', 'primary', projectId);
        const primeContracts = await ProjectService.setPrimeContractPrimary(
            request,
            c.get('user')!.id
        );
        return success(c, primeContracts);
    }
);

app.patch(
    '/:projectId/prime-contract/unpin',
    requirePermission({ primeContract: ['unpin'] }),
    zValidator('json', UnpinPrimeContractsSchema),
    async (c) => {
        const data = c.req.valid('json');
        const projectId = c.req.param('projectId');
        const request = { ...data, projectId };
        await assertProjectActionAccess(c, 'primeContract', 'unpin', projectId);
        await ProjectService.unpinPrimeContracts(request, c.get('user')!.id);
        return success(c, null);
    }
);

app.delete(
    '/:projectId/contract/attachments/:attachmentId',
    requirePermission({ primeContract: ['unpin'] }),
    async (c) => {
        const data = PrimeContractAttachmentParamsSchema.parse({
            projectId: c.req.param('projectId'),
            primeContractId: c.req.param('attachmentId'),
        });
        await assertProjectActionAccess(c, 'primeContract', 'unpin', data.projectId);
        await ProjectService.removePrimeContract(data, c.get('user')!.id);
        return success(c, null);
    }
);

app.patch('/:id/set-active', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    await assertProjectManagementAccess(c, id);
    const project = await ProjectService.setActive(id, c.get('user')!.id);
    return success(c, project);
});

app.patch('/:id/set-inactive', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    await assertProjectManagementAccess(c, id);
    const project = await ProjectService.setInactive(id, c.get('user')!.id);
    return success(c, project);
});

app.patch('/:id/set-closed', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    await assertProjectManagementAccess(c, id);
    const project = await ProjectService.setClosed(id, c.get('user')!.id);
    return success(c, project);
});

app.patch('/:id/set-completed', requirePermission({ project: ['update'] }), async (c) => {
    const id = c.req.param('id');
    await assertProjectManagementAccess(c, id);
    const project = await ProjectService.setCompleted(id, c.get('user')!.id);
    return success(c, project);
});

export default app;
