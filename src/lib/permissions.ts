import { createAccessControl } from 'better-auth/plugins/access';
import { ownerAc } from 'better-auth/plugins/organization/access';

// These are your FIXED permissions
export const statement = {
    user: ['manage-permissions'],
    role: ['list', 'create', 'update', 'delete'],
    project: ['create', 'update', 'delete', 'view-assigned-projects', 'view-all'],
    leave: ['create', 'approve', 'view'],
    costCodeGroup: ['create', 'update', 'delete', 'read'],
    costCode: ['create', 'update', 'delete', 'read'],
    contact: ['create', 'update', 'delete', 'read'],
    professionalRole: ['create', 'update', 'delete', 'read'],
    generalContractor: ['create', 'update', 'delete', 'read'],
    gcType: ['create', 'update', 'delete', 'read'],
    vendor: ['create', 'update', 'delete', 'read'],
    department: ['create', 'update', 'delete', 'read'],
    activityLog: ['create', 'read'],
    rfq: ['create', 'update', 'delete', 'read'],
    purchaseOrder: ['create', 'update', 'delete', 'read'],
    primeChangeOrder: ['read', 'sync'],
    subChangeOrder: ['create', 'update', 'delete', 'read'],
    invoice: ['create', 'update', 'delete', 'read'],
    mail: ['read', 'send'],
} as const;

export const ac = createAccessControl(statement);

export const owner = ac.newRole({
    ...ownerAc.statements,
    user: ['manage-permissions'],
    role: ['list', 'create', 'update', 'delete'],
    project: ['create', 'update', 'delete', 'view-assigned-projects', 'view-all'],
    leave: ['create', 'approve', 'view'],
    costCodeGroup: ['create', 'update', 'delete', 'read'],
    costCode: ['create', 'update', 'delete', 'read'],
    contact: ['create', 'update', 'delete', 'read'],
    professionalRole: ['create', 'update', 'delete', 'read'],
    generalContractor: ['create', 'update', 'delete', 'read'],
    gcType: ['create', 'update', 'delete', 'read'],
    vendor: ['create', 'update', 'delete', 'read'],
    department: ['create', 'update', 'delete', 'read'],
    activityLog: ['create', 'read'],
    rfq: ['create', 'update', 'delete', 'read'],
    purchaseOrder: ['create', 'update', 'delete', 'read'],
    primeChangeOrder: ['read', 'sync'],
    subChangeOrder: ['create', 'update', 'delete', 'read'],
    invoice: ['create', 'update', 'delete', 'read'],
    mail: ['read', 'send'],
});

// Export the type
export type PermissionStatement = typeof statement;
export type ResourceName = keyof PermissionStatement;
export type ResourceActions<T extends ResourceName> = PermissionStatement[T][number];
