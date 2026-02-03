import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';

import { ac } from './permissions';
import { prisma } from './prisma';

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
        transaction: true,
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        organization({
            ac, // Required: defines your fixed permissions
            dynamicAccessControl: {
                enabled: true,
                maximumRolesPerOrganization: 50, // Optional limit
            },
            // Since you don't need multiple orgs:
            // allowUserToCreateOrganization: false, // Prevent users from creating orgs
            // organizationLimit: 1,
        }),
    ],
});
