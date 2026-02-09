import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, organization } from 'better-auth/plugins';

import { ac } from './permissions';
import { prisma } from './prisma';

export const auth = betterAuth({
    trustedOrigins: [process.env.CLIENT_URL!],
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
            allowUserToCreateOrganization: false, // Prevent users from creating orgs
            organizationLimit: 1,
        }),
        admin(),
    ],
});
