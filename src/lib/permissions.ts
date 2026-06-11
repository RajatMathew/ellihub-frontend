import { createAccessControl } from 'better-auth/plugins/access';
import { memberAc, ownerAc } from 'better-auth/plugins/organization/access';

// Better Auth statements are the fixed resource/action vocabulary for the app.
// Add an action here before assigning it to a role or a project action scope.
export const statement = {
    user: ['manage-permissions'],
    role: ['list', 'create', 'update', 'delete'],
    project: ['create', 'update', 'delete', 'view-assigned-projects', 'view-all'],
    projectTeam: ['add', 'remove', 'promote', 'assign-role', 'transfer-lead'],
    primeContract: ['read', 'pin', 'unpin', 'primary'],
    employee: ['create', 'update', 'delete', 'read', 'read-own', 'link-user'],
    leave: ['create', 'approve', 'view'],
    file: ['create', 'update', 'delete', 'read', 'download', 'export'],
    lookup: ['create', 'update', 'delete', 'read'],
    revision: ['read'],
    costCodeGroup: ['create', 'update', 'delete', 'read'],
    costCode: ['create', 'update', 'delete', 'read'],
    contact: ['create', 'update', 'delete', 'read'],
    professionalRole: ['create', 'update', 'delete', 'read'],
    generalContractor: ['create', 'update', 'delete', 'read'],
    gcType: ['create', 'update', 'delete', 'read'],
    vendor: ['create', 'update', 'delete', 'read'],
    department: ['create', 'update', 'delete', 'read'],
    activityLog: ['create', 'read'],
    template: ['create', 'update', 'delete', 'read', 'set-default'],
    integration: ['read', 'manage', 'sync'],
    rfq: ['create', 'update', 'delete', 'read', 'state', 'award', 'unaward', 'void'],
    purchaseOrder: ['create', 'update', 'delete', 'read', 'state', 'issue', 'deliver', 'cancel'],
    primeChangeOrder: ['read', 'fieldwire-projects', 'sync'],
    subChangeOrder: ['create', 'update', 'delete', 'read', 'state', 'approve', 'reject', 'void'],
    invoice: [
        'create',
        'update',
        'delete',
        'read',
        'state',
        'mark-paid',
        'mark-unpaid',
        'dispute',
        'resolve-dispute',
    ],
    mail: ['read', 'send'],
} as const;

export const ac = createAccessControl(statement);

// Export the type
export type PermissionStatement = typeof statement;
export type ResourceName = keyof PermissionStatement;
export type ResourceActions<T extends ResourceName> = PermissionStatement[T][number];
export type ProjectActionScope = 'any-access' | 'member' | 'manager' | 'admin-only';
export type ProjectTeamRole = 'Lead PM' | 'PM' | 'Member';
export type ProjectTeamActionScope = 'project-manager' | 'lead-only' | 'admin-only';
export type ProjectActionResource =
    | 'projectTeam'
    | 'primeContract'
    | 'rfq'
    | 'purchaseOrder'
    | 'subChangeOrder'
    | 'invoice';

// Project actions have two gates:
// 1. The user's app role must include the action in its role permissions below.
// 2. The user must satisfy this per-project scope.
//
// Scope meanings:
// - any-access: users who can access the project can perform the action.
// - member: assigned project team members can perform the action.
// - manager: dev/admin or the project's PM/lead can perform the action.
// - admin-only: only dev/admin can perform the action.
//
// Example: to let assigned project users award RFQs, change rfq.award to 'member'.
// The user role must still include the base rfq.award permission.
export const projectActionScopes = {
    projectTeam: {
        add: 'manager',
        remove: 'manager',
        promote: 'manager',
    },
    primeContract: {
        read: 'any-access',
        pin: 'manager',
        unpin: 'manager',
        primary: 'manager',
    },
    rfq: {
        create: 'member',
        update: 'manager',
        delete: 'manager',
        state: 'any-access',
        award: 'manager',
        unaward: 'manager',
        void: 'manager',
    },
    purchaseOrder: {
        create: 'manager',
        update: 'manager',
        delete: 'manager',
        state: 'any-access',
        issue: 'manager',
        deliver: 'manager',
        cancel: 'manager',
    },
    subChangeOrder: {
        create: 'manager',
        update: 'manager',
        delete: 'manager',
        state: 'any-access',
        approve: 'manager',
        reject: 'manager',
        void: 'manager',
    },
    invoice: {
        create: 'manager',
        update: 'manager',
        delete: 'manager',
        state: 'any-access',
        'mark-paid': 'manager',
        'mark-unpaid': 'manager',
        dispute: 'manager',
        'resolve-dispute': 'manager',
    },
} as const satisfies {
    [Resource in ProjectActionResource]: Partial<
        Record<ResourceActions<Resource>, ProjectActionScope>
    >;
};

// Project-team policy lives here so later client requests are mostly config changes:
// - project-manager: dev/admin, project Lead PM, or project PM.
// - lead-only: dev/admin or the current project Lead PM.
// - admin-only: only dev/admin.
export const projectTeamActionScopes = {
    add: 'project-manager',
    remove: 'project-manager',
    'assign-role': 'lead-only',
    'transfer-lead': 'lead-only',
} as const satisfies Record<
    Exclude<ResourceActions<'projectTeam'>, 'promote'>,
    ProjectTeamActionScope
>;

export const projectTeamRoles = ['Lead PM', 'PM', 'Member'] as const satisfies ProjectTeamRole[];

// Only linked auth PM users can carry project PM authority. Unlinked employees
// and other auth users stay valid as project Members.
export const projectTeamAssignableRolesByAuthRole = {
    dev: ['Member'],
    admin: ['Member'],
    accountant: ['Member'],
    pm: ['Lead PM', 'PM', 'Member'],
    user: ['Member'],
    unlinked: ['Member'],
} as const satisfies Record<string, readonly ProjectTeamRole[]>;

const adminProjectPermissions = [
    'create',
    'update',
    'delete',
    'view-assigned-projects',
    'view-all',
] satisfies ResourceActions<'project'>[];
const managerProjectPermissions = [
    'update',
    'view-assigned-projects',
] satisfies ResourceActions<'project'>[];
const pmProjectPermissions = [
    'create',
    'update',
    'view-assigned-projects',
] satisfies ResourceActions<'project'>[];
const allProjectReadPermissions = [
    'view-assigned-projects',
    'view-all',
] satisfies ResourceActions<'project'>[];

const fullRfqPermissions = [
    'create',
    'update',
    'delete',
    'read',
    'state',
    'award',
    'unaward',
    'void',
] satisfies ResourceActions<'rfq'>[];
const readStateProjectEntityPermissions = ['read', 'state'] satisfies ResourceActions<'rfq'>[];
const fullPurchaseOrderPermissions = [
    'create',
    'update',
    'delete',
    'read',
    'state',
    'issue',
    'deliver',
    'cancel',
] satisfies ResourceActions<'purchaseOrder'>[];
const readStatePurchaseOrderPermissions = [
    'read',
    'state',
] satisfies ResourceActions<'purchaseOrder'>[];
const fullSubChangeOrderPermissions = [
    'create',
    'update',
    'delete',
    'read',
    'state',
    'approve',
    'reject',
    'void',
] satisfies ResourceActions<'subChangeOrder'>[];
const readStateSubChangeOrderPermissions = [
    'read',
    'state',
] satisfies ResourceActions<'subChangeOrder'>[];
const fullInvoicePermissions = [
    'create',
    'update',
    'delete',
    'read',
    'state',
    'mark-paid',
    'mark-unpaid',
    'dispute',
    'resolve-dispute',
] satisfies ResourceActions<'invoice'>[];
const readStateInvoicePermissions = ['read', 'state'] satisfies ResourceActions<'invoice'>[];
const fullPrimeContractPermissions = [
    'read',
    'pin',
    'unpin',
    'primary',
] satisfies ResourceActions<'primeContract'>[];
const readPrimeContractPermissions = ['read'] satisfies ResourceActions<'primeContract'>[];
const fullProjectTeamPermissions = [
    'add',
    'remove',
    'promote',
    'assign-role',
    'transfer-lead',
] satisfies ResourceActions<'projectTeam'>[];

// DEV is admin access plus lookup management. This is the only role with lookup writes.
export const dev = ac.newRole({
    ...ownerAc.statements,
    user: ['manage-permissions'],
    role: ['list', 'create', 'update', 'delete'],
    project: adminProjectPermissions,
    projectTeam: fullProjectTeamPermissions,
    employee: ['create', 'update', 'delete', 'read', 'read-own', 'link-user'],
    leave: ['create', 'approve', 'view'],
    file: ['create', 'update', 'delete', 'read', 'download', 'export'],
    lookup: ['create', 'update', 'delete', 'read'],
    revision: ['read'],
    costCodeGroup: ['create', 'update', 'delete', 'read'],
    costCode: ['create', 'update', 'delete', 'read'],
    contact: ['create', 'update', 'delete', 'read'],
    professionalRole: ['create', 'update', 'delete', 'read'],
    generalContractor: ['create', 'update', 'delete', 'read'],
    gcType: ['create', 'update', 'delete', 'read'],
    vendor: ['create', 'update', 'delete', 'read'],
    department: ['create', 'update', 'delete', 'read'],
    activityLog: ['create', 'read'],
    template: ['create', 'update', 'delete', 'read', 'set-default'],
    integration: ['read', 'manage', 'sync'],
    primeContract: fullPrimeContractPermissions,
    rfq: fullRfqPermissions,
    purchaseOrder: fullPurchaseOrderPermissions,
    primeChangeOrder: ['read', 'fieldwire-projects', 'sync'],
    subChangeOrder: fullSubChangeOrderPermissions,
    invoice: fullInvoicePermissions,
    mail: ['read', 'send'],
});

// ADMIN has full operational access, but lookup writes stay reserved for DEV.
export const adminRole = ac.newRole({
    ...ownerAc.statements,
    user: ['manage-permissions'],
    role: ['list', 'create', 'update', 'delete'],
    project: adminProjectPermissions,
    projectTeam: fullProjectTeamPermissions,
    employee: ['create', 'update', 'delete', 'read', 'read-own', 'link-user'],
    leave: ['create', 'approve', 'view'],
    file: ['create', 'update', 'delete', 'read', 'download', 'export'],
    lookup: ['read'],
    revision: ['read'],
    costCodeGroup: ['create', 'update', 'delete', 'read'],
    costCode: ['create', 'update', 'delete', 'read'],
    contact: ['create', 'update', 'delete', 'read'],
    professionalRole: ['create', 'update', 'delete', 'read'],
    generalContractor: ['create', 'update', 'delete', 'read'],
    gcType: ['create', 'update', 'delete', 'read'],
    vendor: ['create', 'update', 'delete', 'read'],
    department: ['create', 'update', 'delete', 'read'],
    activityLog: ['create', 'read'],
    template: ['create', 'update', 'delete', 'read', 'set-default'],
    integration: ['read', 'manage', 'sync'],
    primeContract: fullPrimeContractPermissions,
    rfq: fullRfqPermissions,
    purchaseOrder: fullPurchaseOrderPermissions,
    primeChangeOrder: ['read', 'fieldwire-projects', 'sync'],
    subChangeOrder: fullSubChangeOrderPermissions,
    invoice: fullInvoicePermissions,
    mail: ['read', 'send'],
});

// ACCOUNTANT can read all projects and change workflow states, but cannot create/edit
// project financial documents unless a specific action is added to this role.
export const accountant = ac.newRole({
    ...memberAc.statements,
    user: [],
    role: [],
    project: allProjectReadPermissions,
    projectTeam: [],
    employee: ['read-own'],
    leave: ['create', 'view'],
    file: [],
    lookup: ['read'],
    revision: ['read'],
    costCodeGroup: [],
    costCode: [],
    contact: ['create', 'update', 'read'],
    professionalRole: ['read'],
    generalContractor: ['create', 'update', 'read'],
    gcType: ['read'],
    vendor: ['create', 'update', 'read'],
    department: [],
    activityLog: ['read'],
    template: [],
    integration: [],
    primeContract: readPrimeContractPermissions,
    rfq: readStateProjectEntityPermissions,
    purchaseOrder: readStatePurchaseOrderPermissions,
    primeChangeOrder: ['read', 'fieldwire-projects'],
    subChangeOrder: readStateSubChangeOrderPermissions,
    invoice: readStateInvoicePermissions,
    mail: [],
});

// PM is an app-level role. It keeps normal assigned-project access and can
// create projects. Project authority still comes from the project team role.
export const pm = ac.newRole({
    ...memberAc.statements,
    user: [],
    role: [],
    project: pmProjectPermissions,
    projectTeam: fullProjectTeamPermissions,
    employee: ['read-own'],
    leave: ['create', 'view'],
    file: ['create', 'read', 'download', 'export'],
    lookup: ['read'],
    revision: ['read'],
    costCodeGroup: [],
    costCode: [],
    contact: ['create', 'update', 'read'],
    professionalRole: ['read'],
    generalContractor: ['create', 'update', 'read'],
    gcType: ['read'],
    vendor: ['create', 'update', 'read'],
    department: [],
    activityLog: ['read'],
    template: [],
    integration: [],
    primeContract: fullPrimeContractPermissions,
    rfq: fullRfqPermissions,
    purchaseOrder: fullPurchaseOrderPermissions,
    primeChangeOrder: ['read', 'fieldwire-projects'],
    subChangeOrder: fullSubChangeOrderPermissions,
    invoice: fullInvoicePermissions,
    mail: [],
});

// USER is the normal role. It can work inside assigned projects but cannot
// manage the project team.
export const user = ac.newRole({
    ...memberAc.statements,
    user: [],
    role: [],
    project: managerProjectPermissions,
    projectTeam: [],
    employee: ['read-own'],
    leave: ['create', 'view'],
    file: ['create', 'read', 'download', 'export'],
    lookup: ['read'],
    revision: ['read'],
    costCodeGroup: [],
    costCode: [],
    contact: ['create', 'update', 'read'],
    professionalRole: ['read'],
    generalContractor: ['create', 'update', 'read'],
    gcType: ['read'],
    vendor: ['create', 'update', 'read'],
    department: [],
    activityLog: ['read'],
    template: [],
    integration: [],
    primeContract: fullPrimeContractPermissions,
    rfq: fullRfqPermissions,
    purchaseOrder: fullPurchaseOrderPermissions,
    primeChangeOrder: ['read', 'fieldwire-projects'],
    subChangeOrder: fullSubChangeOrderPermissions,
    invoice: fullInvoicePermissions,
    mail: [],
});

export const owner = adminRole;
export const member = user;
export const appRoles = {
    dev,
    admin: adminRole,
    accountant,
    pm,
    user,
    owner,
    member,
};
