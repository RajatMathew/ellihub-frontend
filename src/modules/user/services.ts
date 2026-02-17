import { TransactionClient } from '@db/internal/prismaNamespace';
import { auth } from '@lib/auth';
import { prisma as prismaClient } from '@lib/prisma';
import { InternalServerError, NotFoundError } from '@utils';
import { User } from 'better-auth';
import { ulid } from 'ulid';

import { RoleCreateRequest, UserCreateRequest } from './models';

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

    createUser: async (
        request: UserCreateRequest,
        tx?: TransactionClient,
        employeeId?: string,
        roleId?: string
    ): Promise<User> => {
        const prisma = tx || prismaClient;

        const user = await prisma.user.create({
            data: {
                id: employeeId || ulid(),
                email: request.email,
                name: request.name,
                role: request.role,
                profile: employeeId,
            },
        });

        if (employeeId && roleId) {
            const org = await prisma.organization.findFirst({
                where: {
                    slug: 'default',
                },
            });

            if (!org) throw new InternalServerError('No default org set.');

            const role = await prisma.organizationRole.findUnique({ where: { id: roleId } });

            if (!role) throw new NotFoundError('No role found with id: ' + roleId);

            await prisma.member.create({
                data: {
                    id: ulid(),
                    userId: user.id,
                    role: role.role,
                    organizationId: org.id,
                    createdAt: new Date(),
                },
            });
        }

        return user;
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
