import { auth } from '@lib/auth';

import { RoleCreateRequest } from './models';

export const UserService = {
    getUser: async (id: string) => {
        const db = auth.options.database({});

        db.findOne({
            model: 'user',
            where: [{ field: 'id', value: id }],
        });
        return await auth.options.database;
    },

    getAllUsers: async (headers: Headers) => {
        const users = auth.api.listUsers({
            query: {},
            headers,
        });

        return users;
    },

    createUser: async () => {
        // const user = auth.api.createUser({
        //     body: {
        //     }
        // })
    },

    createOrgRole: async (request: RoleCreateRequest, headers: Headers) => {
        const org = await auth.api.getFullOrganization({
            query: {
                organizationSlug: 'default',
            },
            headers,
        });

        const role = await auth.api.createOrgRole({
            body: {
                ...request,
                organizationId: org!.id,
            },
            headers,
        });

        return role.roleData;
    },

    getOrgRoles: async (headers: Headers) => {
        try {
            const org = await auth.api.getFullOrganization({
                query: {
                    organizationSlug: 'default',
                },
                headers,
            });

            if (!org) {
                throw new Error('Organization not found');
            }

            const roles = await auth.api.listOrgRoles({
                query: {
                    organizationId: org.id,
                },
                headers,
            });

            return roles;
        } catch (error) {
            console.error('Error fetching org roles:', error);
            throw error;
        }
    },
};
