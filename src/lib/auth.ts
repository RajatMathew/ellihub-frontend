import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, organization } from 'better-auth/plugins';

import { initializeOrganizationRoles } from './organization-hooks';
import { ac, owner } from './permissions';
import { prisma } from './prisma';

export const auth = betterAuth({
    trustedOrigins:
        process.env.NODE_ENV !== 'production'
            ? ['http://localhost:*', process.env.BETTER_AUTH_BASE_URL!, process.env.CLIENT_URL!]
            : [process.env.CLIENT_URL!, process.env.BETTER_AUTH_BASE_URL!],
    database: prismaAdapter(prisma, {
        provider: 'postgresql',
        transaction: true,
    }),
    baseURL: process.env.BETTER_AUTH_BASE_URL!,
    basePath: '/api/v1/auth',
    advanced: {
        defaultCookieAttributes: {
            sameSite: 'none', // allow cross-site
            secure: true, // required with sameSite: none
            httpOnly: true,
        },
        useSecureCookies: true,
    },
    emailAndPassword: {
        enabled: true,
    },
    plugins: [
        organization({
            ac, // Required: defines your fixed permissions
            roles: {
                owner,
            },
            dynamicAccessControl: {
                enabled: true,
                maximumRolesPerOrganization: 50, // Optional limit
            },
            // Since you don't need multiple orgs:
            allowUserToCreateOrganization: false, // Prevent users from creating orgs
            organizationLimit: 1,
            organizationHooks: {
                afterCreateOrganization: async ({ organization: org }) => {
                    // Initialize default roles for the organization
                    await initializeOrganizationRoles(org.id);
                },
            },
        }),
        admin(),
    ],
});
