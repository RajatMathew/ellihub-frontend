import { createAccessControl } from 'better-auth/plugins/access';

// These are your FIXED permissions
const statement = {
    user: ['manage-permissions'],
    project: ['create', 'update', 'delete', 'view-assigned-projects', 'view-all'],
    leave: ['approve', 'view'],
} as const;

export const ac = createAccessControl(statement);

// Export the type
export type PermissionStatement = typeof statement;
export type ResourceName = keyof PermissionStatement;
export type ResourceActions<T extends ResourceName> = PermissionStatement[T][number];
