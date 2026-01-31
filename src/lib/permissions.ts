import { createAccessControl } from 'better-auth/plugins/access';

// These are your FIXED permissions
const statement = {
    project: ['create', 'update', 'delete'],
} as const;

export const ac = createAccessControl(statement);
