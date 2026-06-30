import { Prisma } from '@db/client';
import {
    accountant,
    ap,
    adminRole,
    dev,
    pm,
    user,
    statement,
    projectActionScopes,
    projectTeamActionScopes,
    type PermissionStatement,
    type ProjectActionResource,
    type ProjectActionScope,
    type ProjectTeamActionScope,
    type ProjectTeamRole,
    type ResourceName,
    type ResourceActions,
} from '@lib/permissions';
import { prisma } from '@lib/prisma';
import { ForbiddenError, UnauthorizedError } from '@utils';
import { Context } from 'hono';

export type AppRole = 'dev' | 'admin' | 'accountant' | 'ap' | 'pm' | 'user';
export type ProjectScope = 'all' | 'assigned' | 'none';

// Normalized auth data used by route guards. This keeps Better Auth roles,
// employee linkage, project scope, and role permissions in one place.
export type AccessContext = {
    userId: string;
    role: AppRole;
    isAdmin: boolean;
    isDev: boolean;
    employeeId: string | null;
    projectScope: ProjectScope;
    permissions: Record<string, readonly string[]>;
};

type SessionUser = {
    id: string;
    email?: string | null;
    role?: string | string[] | null;
    profile?: string | null;
};

type ActivityEntityType =
    | 'user'
    | 'contact'
    | 'vendor'
    | 'gc'
    | 'employee'
    | 'department'
    | 'file'
    | 'costCode'
    | 'costCodeCategory'
    | 'professionalRole'
    | 'project'
    | 'rfq'
    | 'purchaseOrder'
    | 'primeChangeOrder'
    | 'subChangeOrder'
    | 'invoice'
    | 'template';

type RevisionEntityType = 'RFQ' | 'PURCHASE_ORDER' | 'SUB_CHANGE_ORDER' | 'INVOICE' | 'PROJECT';
type ProjectManagedEntityType = 'project' | 'rfq' | 'purchaseOrder' | 'subChangeOrder' | 'invoice';
export type ProjectActionCapabilities = {
    [Resource in ProjectActionResource]: Partial<Record<ResourceActions<Resource>, boolean>>;
} & {
    projectTeam?: Partial<
        Record<
            ResourceActions<'projectTeam'> | 'removeMember' | 'removePM' | 'removeLeadPM',
            boolean
        >
    >;
};

const NO_ACCESS_PROJECT_WHERE: Prisma.ProjectWhereInput = { id: { in: [] } };

const ACTIVITY_PERMISSION_RESOURCES: Partial<Record<ActivityEntityType, ResourceName>> = {
    contact: 'contact',
    vendor: 'vendor',
    gc: 'generalContractor',
    department: 'department',
    costCode: 'costCode',
    costCodeCategory: 'costCodeGroup',
    professionalRole: 'professionalRole',
    template: 'template',
};

type FileChainItem = {
    id: string;
    name: string;
    parentId: string | null;
    protectedFolderType: string | null;
    deletedAt: Date | null;
};

type FileAccessScope =
    | { type: 'project'; id: string }
    | { type: 'vendor'; id: string }
    | { type: 'generalContractor'; id: string }
    | { type: 'global' };

function normalizeRole(role: SessionUser['role']): AppRole {
    const roles = Array.isArray(role)
        ? role
        : typeof role === 'string'
          ? role.split(',').map((item) => item.trim())
          : [];

    if (roles.includes('dev')) return 'dev';
    if (roles.includes('admin') || roles.includes('owner')) return 'admin';
    if (roles.includes('accountant')) return 'accountant';
    if (roles.includes('ap')) return 'ap';
    if (roles.includes('pm')) return 'pm';
    return 'user';
}

function pickStatementPermissions(
    statements: Record<string, readonly string[]>
): Record<string, readonly string[]> {
    const permissions: Record<string, readonly string[]> = {};

    for (const resource of Object.keys(statements)) {
        if (resource in statement) {
            permissions[resource] = statements[resource];
        }
    }

    return permissions;
}

function getRolePermissions(role: AppRole): Record<string, readonly string[]> {
    switch (role) {
        case 'dev':
            return pickStatementPermissions(dev.statements);
        case 'admin':
            return pickStatementPermissions(adminRole.statements);
        case 'accountant':
            return pickStatementPermissions(accountant.statements);
        case 'ap':
            return pickStatementPermissions(ap.statements);
        case 'pm':
            return pickStatementPermissions(pm.statements);
        case 'user':
            return pickStatementPermissions(user.statements);
    }
}

function hasPermission(access: AccessContext, resource: ResourceName, action: string) {
    return access.permissions[resource]?.includes(action) ?? false;
}

// Missing project action config defaults to manager so new project actions start restricted.
function getProjectActionScope(
    resource: ProjectActionResource,
    action: string
): ProjectActionScope {
    const scopes = projectActionScopes[resource] as Partial<Record<string, ProjectActionScope>>;
    return scopes[action] ?? 'manager';
}

function getProjectTeamActionScope(action: string): ProjectTeamActionScope {
    const scopes = projectTeamActionScopes as Partial<Record<string, ProjectTeamActionScope>>;
    return scopes[action] ?? 'lead-only';
}

async function resolveEmployeeId(user: SessionUser): Promise<string | null> {
    if (user.profile) {
        const employee = await prisma.employee.findFirst({
            where: { id: user.profile, deletedAt: null },
            select: { id: true },
        });
        if (employee) return employee.id;
    }

    const byUserId = await prisma.employee.findFirst({
        where: { userId: user.id, deletedAt: null },
        select: { id: true },
    });
    if (byUserId) return byUserId.id;

    if (!user.email) return null;

    const byEmail = await prisma.employee.findFirst({
        where: { email: user.email, deletedAt: null },
        select: { id: true },
    });

    return byEmail?.id ?? null;
}

export async function getAccessContext(c: Context): Promise<AccessContext> {
    const user = c.get('user') as SessionUser | null;
    if (!user?.id) throw new UnauthorizedError('Unauthorized');

    const role = normalizeRole(user.role);
    const isAdmin = role === 'dev' || role === 'admin';
    const isDev = role === 'dev';
    const employeeId = await resolveEmployeeId(user);

    return {
        userId: user.id,
        role,
        isAdmin,
        isDev,
        employeeId,
        projectScope:
            role === 'dev' || role === 'admin' || role === 'accountant' || role === 'ap'
                ? 'all'
                : employeeId
                  ? 'assigned'
                  : 'none',
        permissions: getRolePermissions(role),
    };
}

export async function requireAdmin(c: Context): Promise<AccessContext> {
    const access = await getAccessContext(c);
    if (!access.isAdmin) throw new ForbiddenError('Admin access required');
    return access;
}

// Use these helpers when listing project-owned records. Admin/accountant/A-P/dev can see all;
// normal users only see assigned projects.
export function projectAssignmentWhereForEmployee(employeeId: string): Prisma.ProjectWhereInput {
    return {
        OR: [{ leadPMId: employeeId }, { teamMembers: { some: { employeeId } } }],
    };
}

export function projectWhereForAccess(access: AccessContext): Prisma.ProjectWhereInput {
    if (access.projectScope === 'all') return {};
    if (!access.employeeId) return NO_ACCESS_PROJECT_WHERE;
    return projectAssignmentWhereForEmployee(access.employeeId);
}

export function mergeProjectAccessWhere(
    access: AccessContext,
    where: Prisma.ProjectWhereInput
): Prisma.ProjectWhereInput {
    const accessWhere = projectWhereForAccess(access);
    if (access.projectScope === 'all') return where;
    return { AND: [where, accessWhere] };
}

export async function assertProjectAccess(c: Context, projectId: string): Promise<AccessContext> {
    const access = await getAccessContext(c);
    if (access.projectScope === 'all') return access;
    if (!access.employeeId) throw new ForbiddenError('Project access denied');

    const count = await prisma.project.count({
        where: {
            id: projectId,
            deletedAt: null,
            ...projectAssignmentWhereForEmployee(access.employeeId),
        },
    });

    if (count < 1) throw new ForbiddenError('Project access denied');
    return access;
}

// Lead PM means the project's lead PM or a team member marked as lead.
export async function isLeadProjectManager(
    access: AccessContext,
    projectId: string
): Promise<boolean> {
    if (!access.employeeId) return false;

    const count = await prisma.project.count({
        where: {
            id: projectId,
            deletedAt: null,
            OR: [
                { leadPMId: access.employeeId },
                { teamMembers: { some: { employeeId: access.employeeId, isLead: true } } },
            ],
        },
    });

    return count > 0;
}

export async function getCurrentProjectTeamRole(
    access: AccessContext,
    projectId: string
): Promise<ProjectTeamRole | null> {
    if (access.role === 'dev' || access.role === 'admin') return 'Lead PM';
    if (!access.employeeId) return null;

    const [project, member] = await Promise.all([
        prisma.project.findFirst({
            where: { id: projectId, deletedAt: null },
            select: { leadPMId: true },
        }),
        prisma.projectTeamMember.findUnique({
            where: { employeeId_projectId: { employeeId: access.employeeId, projectId } },
            select: { role: true, isLead: true },
        }),
    ]);

    if (!project) return null;
    if (project.leadPMId === access.employeeId || member?.isLead) return 'Lead PM';
    if (member?.role === 'PM') return 'PM';
    if (member) return 'Member';
    return null;
}

export async function isProjectRole(
    access: AccessContext,
    projectId: string,
    roles: readonly ProjectTeamRole[]
): Promise<boolean> {
    const role = await getCurrentProjectTeamRole(access, projectId);
    return !!role && roles.includes(role);
}

export async function canManageProject(access: AccessContext, projectId: string): Promise<boolean> {
    if (access.role === 'dev' || access.role === 'admin') return true;
    if (access.role === 'accountant' || access.role === 'ap') return false;
    return isProjectRole(access, projectId, ['Lead PM', 'PM']);
}

async function canManageProjectWorkflow(
    access: AccessContext,
    projectId: string
): Promise<boolean> {
    if (access.role === 'dev' || access.role === 'admin' || access.role === 'ap') return true;
    if (access.role === 'accountant') return false;
    return isProjectRole(access, projectId, ['Lead PM', 'PM']);
}

export async function canPerformProjectTeamAction(
    access: AccessContext,
    projectId: string,
    action: Exclude<ResourceActions<'projectTeam'>, 'promote'>
): Promise<boolean> {
    if (!hasPermission(access, 'projectTeam', action)) return false;

    const scope = getProjectTeamActionScope(action);
    switch (scope) {
        case 'admin-only':
            return access.role === 'dev' || access.role === 'admin';
        case 'lead-only':
            return access.role === 'dev' || access.role === 'admin'
                ? true
                : isProjectRole(access, projectId, ['Lead PM']);
        case 'project-manager':
            return access.role === 'dev' || access.role === 'admin'
                ? true
                : isProjectRole(access, projectId, ['Lead PM', 'PM']);
    }
}

// Project member means assigned to the project team or set as lead PM.
export async function isProjectMember(access: AccessContext, projectId: string): Promise<boolean> {
    if (access.role === 'dev' || access.role === 'admin') return true;
    if (!access.employeeId) return false;

    const count = await prisma.project.count({
        where: {
            id: projectId,
            deletedAt: null,
            OR: [
                { leadPMId: access.employeeId },
                { teamMembers: { some: { employeeId: access.employeeId } } },
            ],
        },
    });

    return count > 0;
}

export async function canAccessProjectActionScope(
    access: AccessContext,
    projectId: string,
    resource: ProjectActionResource,
    action: string
): Promise<boolean> {
    const scope = getProjectActionScope(resource, action);

    if (resource === 'projectTeam' && action !== 'promote') {
        return canPerformProjectTeamAction(
            access,
            projectId,
            action as Exclude<ResourceActions<'projectTeam'>, 'promote'>
        );
    }

    // This only checks the project relationship scope. The base role permission
    // is checked separately by canPerformProjectAction/assertProjectActionAccess.
    switch (scope) {
        case 'admin-only':
            return access.role === 'dev' || access.role === 'admin';
        case 'any-access':
            return access.projectScope === 'all' || isProjectMember(access, projectId);
        case 'member':
            return access.projectScope === 'all' || isProjectMember(access, projectId);
        case 'manager':
            return canManageProjectWorkflow(access, projectId);
    }
}

export async function canPerformProjectAction(
    access: AccessContext,
    projectId: string,
    resource: ProjectActionResource,
    action: string
): Promise<boolean> {
    // Both gates must pass: role permission and per-project scope.
    return (
        hasPermission(access, resource, action) &&
        (await canAccessProjectActionScope(access, projectId, resource, action))
    );
}

export async function getProjectActionCapabilities(
    access: AccessContext,
    projectId: string
): Promise<ProjectActionCapabilities> {
    // This response drives frontend buttons/forms. If a scope changes in permissions.ts,
    // the UI changes automatically through project.capabilities.actions.
    const entries = await Promise.all(
        (Object.keys(projectActionScopes) as ProjectActionResource[]).map(async (resource) => {
            const actionEntries = await Promise.all(
                Object.keys(projectActionScopes[resource]).map(async (action) => [
                    action,
                    await canPerformProjectAction(access, projectId, resource, action),
                ])
            );

            return [resource, Object.fromEntries(actionEntries)] as const;
        })
    );

    const capabilities = Object.fromEntries(entries) as ProjectActionCapabilities;
    const [remove, isAdmin, currentRole] = await Promise.all([
        canPerformProjectTeamAction(access, projectId, 'remove'),
        Promise.resolve(access.role === 'dev' || access.role === 'admin'),
        getCurrentProjectTeamRole(access, projectId),
    ]);

    capabilities.projectTeam = {
        ...capabilities.projectTeam,
        add: await canPerformProjectTeamAction(access, projectId, 'add'),
        remove,
        'assign-role': await canPerformProjectTeamAction(access, projectId, 'assign-role'),
        'transfer-lead': await canPerformProjectTeamAction(access, projectId, 'transfer-lead'),
        removeMember: remove,
        removePM: isAdmin,
        removeLeadPM: isAdmin,
    };

    if (currentRole) {
        capabilities.projectTeam.promote =
            capabilities.projectTeam['transfer-lead'] || capabilities.projectTeam.promote;
    }

    return capabilities;
}

export async function assertProjectManagementAccess(
    c: Context,
    projectId: string
): Promise<AccessContext> {
    const access = await assertProjectAccess(c, projectId);
    if (!(await canManageProject(access, projectId))) {
        throw new ForbiddenError('Project management access denied');
    }
    return access;
}

// Use this for project workflow/action routes. It enforces both the base role
// permission and the configured project action scope from permissions.ts.
export async function assertProjectActionAccess(
    c: Context,
    resource: ProjectActionResource,
    action: string,
    projectId: string
): Promise<AccessContext> {
    const access = await assertProjectAccess(c, projectId);
    if (
        !hasPermission(access, resource, action) ||
        !(await canAccessProjectActionScope(access, projectId, resource, action))
    ) {
        throw new ForbiddenError('Project action access denied');
    }
    return access;
}

async function getProjectIdForSchedule(scheduleId: string): Promise<string | null> {
    return (
        (
            await prisma.projectSchedule.findUnique({
                where: { id: scheduleId },
                select: { projectId: true },
            })
        )?.projectId ?? null
    );
}

export async function assertProjectScheduleActionAccess(
    c: Context,
    scheduleId: string,
    action: ResourceActions<'projectSchedule'>
): Promise<AccessContext> {
    const projectId = await getProjectIdForSchedule(scheduleId);
    if (!projectId) throw new ForbiddenError('Project schedule access denied');
    return assertProjectActionAccess(c, 'projectSchedule', action, projectId);
}

export async function assertEmployeeSelfOrAdmin(c: Context, employeeId: string): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;
    if (!access.employeeId || access.employeeId !== employeeId) {
        throw new ForbiddenError('Employee access denied');
    }
}

export async function getProjectIdForFile(fileId: string): Promise<string | null> {
    let current = await prisma.file.findUnique({
        where: { id: fileId },
        select: {
            id: true,
            name: true,
            parentId: true,
            protectedFolderType: true,
            deletedAt: true,
        },
    });

    while (current) {
        if (current.deletedAt) return null;
        if (current.protectedFolderType === 'PROJECT_ROOT') return current.name;
        if (!current.parentId) return null;

        current = await prisma.file.findUnique({
            where: { id: current.parentId },
            select: {
                id: true,
                name: true,
                parentId: true,
                protectedFolderType: true,
                deletedAt: true,
            },
        });
    }

    return null;
}

async function getFileChain(fileId: string): Promise<FileChainItem[]> {
    const chain: FileChainItem[] = [];
    let current = await prisma.file.findUnique({
        where: { id: fileId },
        select: {
            id: true,
            name: true,
            parentId: true,
            protectedFolderType: true,
            deletedAt: true,
        },
    });

    while (current) {
        if (current.deletedAt) return [];
        chain.unshift(current);
        if (!current.parentId) break;

        current = await prisma.file.findUnique({
            where: { id: current.parentId },
            select: {
                id: true,
                name: true,
                parentId: true,
                protectedFolderType: true,
                deletedAt: true,
            },
        });
    }

    return chain;
}

async function getFileAccessScope(fileId: string): Promise<FileAccessScope> {
    const chain = await getFileChain(fileId);
    if (!chain.length) return { type: 'global' };

    const projectFolder = chain.find((item) => item.protectedFolderType === 'PROJECT_ROOT');
    if (projectFolder) return { type: 'project', id: projectFolder.name };

    const directoryRootIndex = chain.findIndex((item) => {
        const name = item.name.toLowerCase();
        return name === 'vendor' || name === 'gc';
    });

    const entityFolder = directoryRootIndex >= 0 ? chain[directoryRootIndex + 1] : undefined;
    if (!entityFolder) return { type: 'global' };

    const directoryRoot = chain[directoryRootIndex].name.toLowerCase();
    if (directoryRoot === 'vendor') return { type: 'vendor', id: entityFolder.name };
    return { type: 'generalContractor', id: entityFolder.name };
}

async function assertFileScopedAccess(
    c: Context,
    fileId: string,
    directoryActions: readonly ('read' | 'create' | 'update')[]
): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;

    const scope = await getFileAccessScope(fileId);

    if (scope.type === 'project') {
        await assertProjectAccess(c, scope.id);
        return;
    }

    if (scope.type === 'vendor') {
        if (directoryActions.some((action) => hasPermission(access, 'vendor', action))) return;
        throw new ForbiddenError('File access denied');
    }

    if (scope.type === 'generalContractor') {
        if (directoryActions.some((action) => hasPermission(access, 'generalContractor', action))) {
            return;
        }
    }

    throw new ForbiddenError('File access denied');
}

export async function assertFileAccess(c: Context, fileId: string): Promise<void> {
    await assertFileScopedAccess(c, fileId, ['read']);
}

export async function assertFileCreateAccess(c: Context, parentId?: string | null): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;
    if (!parentId) throw new ForbiddenError('File upload requires an accessible folder');

    await assertFileScopedAccess(c, parentId, ['create', 'update']);
}

export async function getProjectIdForActivityEntity(
    entityType: ActivityEntityType,
    entityId: string
): Promise<string | null> {
    switch (entityType) {
        case 'project':
            return entityId;
        case 'rfq':
            return (
                (
                    await prisma.rFQ.findUnique({
                        where: { id: entityId },
                        select: { projectId: true },
                    })
                )?.projectId ?? null
            );
        case 'purchaseOrder':
            return (
                (
                    await prisma.purchaseOrder.findUnique({
                        where: { id: entityId },
                        select: { projectId: true },
                    })
                )?.projectId ?? null
            );
        case 'subChangeOrder':
            return (
                (
                    await prisma.subChangeOrder.findUnique({
                        where: { id: entityId },
                        select: { projectId: true },
                    })
                )?.projectId ?? null
            );
        case 'invoice':
            return (
                (
                    await prisma.invoice.findUnique({
                        where: { id: entityId },
                        select: { projectId: true },
                    })
                )?.projectId ?? null
            );
        case 'primeChangeOrder':
            return (
                (
                    await prisma.primeChangeOrder.findUnique({
                        where: { id: entityId },
                        select: { projectId: true },
                    })
                )?.projectId ?? null
            );
        case 'file':
            return getProjectIdForFile(entityId);
        default:
            return null;
    }
}

// Entity helpers resolve a project id first, then apply the appropriate project guard.
export async function assertProjectEntityManagementAccess(
    c: Context,
    entityType: ProjectManagedEntityType,
    entityId: string
): Promise<AccessContext> {
    const projectId =
        entityType === 'project'
            ? entityId
            : await getProjectIdForActivityEntity(entityType, entityId);
    if (!projectId) throw new ForbiddenError('Project management access denied');
    return assertProjectManagementAccess(c, projectId);
}

export async function assertProjectEntityActionAccess(
    c: Context,
    resource: ProjectActionResource,
    action: string,
    entityType: ProjectManagedEntityType,
    entityId: string
): Promise<AccessContext> {
    const projectId =
        entityType === 'project'
            ? entityId
            : await getProjectIdForActivityEntity(entityType, entityId);
    if (!projectId) throw new ForbiddenError('Project action access denied');
    return assertProjectActionAccess(c, resource, action, projectId);
}

export async function assertProjectActionForActivityEntity(
    c: Context,
    resource: ProjectActionResource,
    action: string,
    entityType: ActivityEntityType,
    entityId: string
): Promise<AccessContext> {
    const projectId = await getProjectIdForActivityEntity(entityType, entityId);
    if (!projectId) throw new ForbiddenError('Project action access denied');
    return assertProjectActionAccess(c, resource, action, projectId);
}

export async function assertActivityEntityAccess(
    c: Context,
    entityType: ActivityEntityType,
    entityId: string
): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;

    if (entityType === 'employee') {
        await assertEmployeeSelfOrAdmin(c, entityId);
        return;
    }

    if (entityType === 'user') {
        if (entityId === access.userId) return;
        throw new ForbiddenError('Entity access denied');
    }

    const permissionResource = ACTIVITY_PERMISSION_RESOURCES[entityType];
    if (permissionResource) {
        if (hasPermission(access, permissionResource, 'read')) return;
        throw new ForbiddenError('Entity access denied');
    }

    const projectId = await getProjectIdForActivityEntity(entityType, entityId);
    if (!projectId) throw new ForbiddenError('Entity access denied');
    await assertProjectAccess(c, projectId);
}

export async function assertRfqVendorQuoteAccess(c: Context, quoteId: string): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;

    const quote = await prisma.rFQVendorQuote.findUnique({
        where: { id: quoteId },
        select: { rfq: { select: { projectId: true } } },
    });

    if (!quote?.rfq.projectId) throw new ForbiddenError('RFQ quote access denied');
    await assertProjectAccess(c, quote.rfq.projectId);
}

export async function assertRfqVendorQuoteManagementAccess(
    c: Context,
    quoteId: string
): Promise<void> {
    const quote = await prisma.rFQVendorQuote.findUnique({
        where: { id: quoteId },
        select: { rfq: { select: { projectId: true } } },
    });

    if (!quote?.rfq.projectId) throw new ForbiddenError('RFQ quote access denied');
    await assertProjectManagementAccess(c, quote.rfq.projectId);
}

export async function assertRfqVendorQuoteActionAccess(
    c: Context,
    quoteId: string,
    action: ResourceActions<'rfq'>
): Promise<void> {
    const quote = await prisma.rFQVendorQuote.findUnique({
        where: { id: quoteId },
        select: { rfq: { select: { projectId: true } } },
    });

    if (!quote?.rfq.projectId) throw new ForbiddenError('RFQ quote access denied');
    await assertProjectActionAccess(c, 'rfq', action, quote.rfq.projectId);
}

export async function assertRfqAttachmentAccess(c: Context, attachmentId: string): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;

    const attachment = await prisma.rFQAttachment.findUnique({
        where: { id: attachmentId },
        select: { rfq: { select: { projectId: true } } },
    });

    if (!attachment?.rfq.projectId) throw new ForbiddenError('RFQ attachment access denied');
    await assertProjectAccess(c, attachment.rfq.projectId);
}

export async function assertRfqAttachmentManagementAccess(
    c: Context,
    attachmentId: string
): Promise<void> {
    const attachment = await prisma.rFQAttachment.findUnique({
        where: { id: attachmentId },
        select: { rfq: { select: { projectId: true } } },
    });

    if (!attachment?.rfq.projectId) throw new ForbiddenError('RFQ attachment access denied');
    await assertProjectManagementAccess(c, attachment.rfq.projectId);
}

export async function assertRfqAttachmentActionAccess(
    c: Context,
    attachmentId: string,
    action: ResourceActions<'rfq'>
): Promise<void> {
    const attachment = await prisma.rFQAttachment.findUnique({
        where: { id: attachmentId },
        select: { rfq: { select: { projectId: true } } },
    });

    if (!attachment?.rfq.projectId) throw new ForbiddenError('RFQ attachment access denied');
    await assertProjectActionAccess(c, 'rfq', action, attachment.rfq.projectId);
}

export async function assertPoAttachmentAccess(c: Context, attachmentId: string): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;

    const attachment = await prisma.pOAttachment.findUnique({
        where: { id: attachmentId },
        select: { purchaseOrder: { select: { projectId: true } } },
    });

    if (!attachment?.purchaseOrder.projectId)
        throw new ForbiddenError('PO attachment access denied');
    await assertProjectAccess(c, attachment.purchaseOrder.projectId);
}

export async function assertPoAttachmentManagementAccess(
    c: Context,
    attachmentId: string
): Promise<void> {
    const attachment = await prisma.pOAttachment.findUnique({
        where: { id: attachmentId },
        select: { purchaseOrder: { select: { projectId: true } } },
    });

    if (!attachment?.purchaseOrder.projectId)
        throw new ForbiddenError('PO attachment access denied');
    await assertProjectManagementAccess(c, attachment.purchaseOrder.projectId);
}

export async function assertPoAttachmentActionAccess(
    c: Context,
    attachmentId: string,
    action: ResourceActions<'purchaseOrder'>
): Promise<void> {
    const attachment = await prisma.pOAttachment.findUnique({
        where: { id: attachmentId },
        select: { purchaseOrder: { select: { projectId: true } } },
    });

    if (!attachment?.purchaseOrder.projectId)
        throw new ForbiddenError('PO attachment access denied');
    await assertProjectActionAccess(c, 'purchaseOrder', action, attachment.purchaseOrder.projectId);
}

export async function assertScoAttachmentAccess(c: Context, attachmentId: string): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;

    const attachment = await prisma.sCOAttachment.findUnique({
        where: { id: attachmentId },
        select: { sco: { select: { projectId: true } } },
    });

    if (!attachment?.sco.projectId) throw new ForbiddenError('SCO attachment access denied');
    await assertProjectAccess(c, attachment.sco.projectId);
}

export async function assertScoAttachmentManagementAccess(
    c: Context,
    attachmentId: string
): Promise<void> {
    const attachment = await prisma.sCOAttachment.findUnique({
        where: { id: attachmentId },
        select: { sco: { select: { projectId: true } } },
    });

    if (!attachment?.sco.projectId) throw new ForbiddenError('SCO attachment access denied');
    await assertProjectManagementAccess(c, attachment.sco.projectId);
}

export async function assertScoAttachmentActionAccess(
    c: Context,
    attachmentId: string,
    action: ResourceActions<'subChangeOrder'>
): Promise<void> {
    const attachment = await prisma.sCOAttachment.findUnique({
        where: { id: attachmentId },
        select: { sco: { select: { projectId: true } } },
    });

    if (!attachment?.sco.projectId) throw new ForbiddenError('SCO attachment access denied');
    await assertProjectActionAccess(c, 'subChangeOrder', action, attachment.sco.projectId);
}

export async function assertInvoiceAttachmentAccess(
    c: Context,
    attachmentId: string
): Promise<void> {
    const access = await getAccessContext(c);
    if (access.isAdmin) return;

    const attachment = await prisma.invoiceAttachment.findUnique({
        where: { id: attachmentId },
        select: { invoice: { select: { projectId: true } } },
    });

    if (!attachment?.invoice.projectId)
        throw new ForbiddenError('Invoice attachment access denied');
    await assertProjectAccess(c, attachment.invoice.projectId);
}

export async function assertInvoiceAttachmentManagementAccess(
    c: Context,
    attachmentId: string
): Promise<void> {
    const attachment = await prisma.invoiceAttachment.findUnique({
        where: { id: attachmentId },
        select: { invoice: { select: { projectId: true } } },
    });

    if (!attachment?.invoice.projectId)
        throw new ForbiddenError('Invoice attachment access denied');
    await assertProjectManagementAccess(c, attachment.invoice.projectId);
}

export async function assertInvoiceAttachmentActionAccess(
    c: Context,
    attachmentId: string,
    action: ResourceActions<'invoice'>
): Promise<void> {
    const attachment = await prisma.invoiceAttachment.findUnique({
        where: { id: attachmentId },
        select: { invoice: { select: { projectId: true } } },
    });

    if (!attachment?.invoice.projectId)
        throw new ForbiddenError('Invoice attachment access denied');
    await assertProjectActionAccess(c, 'invoice', action, attachment.invoice.projectId);
}

export async function getProjectIdForRevisionEntity(
    entityType: RevisionEntityType,
    entityId: string
): Promise<string | null> {
    switch (entityType) {
        case 'PROJECT':
            return entityId;
        case 'RFQ':
            return getProjectIdForActivityEntity('rfq', entityId);
        case 'PURCHASE_ORDER':
            return getProjectIdForActivityEntity('purchaseOrder', entityId);
        case 'SUB_CHANGE_ORDER':
            return getProjectIdForActivityEntity('subChangeOrder', entityId);
        case 'INVOICE':
            return getProjectIdForActivityEntity('invoice', entityId);
    }
}

export async function assertRevisionEntityAccess(
    c: Context,
    entityType: RevisionEntityType,
    entityId: string
): Promise<void> {
    const projectId = await getProjectIdForRevisionEntity(entityType, entityId);
    if (!projectId) throw new ForbiddenError('Revision access denied');
    await assertProjectAccess(c, projectId);
}

export function permissionResponseForAccess(access: AccessContext): {
    userId: string;
    role: AppRole;
    isDev: boolean;
    isAdmin: boolean;
    employeeId: string | null;
    projectScope: ProjectScope;
    permissions: Partial<PermissionStatement>;
} {
    return {
        userId: access.userId,
        role: access.role,
        isDev: access.isDev,
        isAdmin: access.isAdmin,
        employeeId: access.employeeId,
        projectScope: access.projectScope,
        permissions: access.permissions as Partial<PermissionStatement>,
    };
}
