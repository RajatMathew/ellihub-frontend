import { TransactionClient } from '@db/internal/prismaNamespace';
import { auth } from '@lib/auth';
import { prisma as prismaClient } from '@lib/prisma';
import { ConflictError, InternalServerError, NotFoundError } from '@utils';
import { User } from 'better-auth';
import { ulid } from 'ulid';

import { RoleCreateRequest, UserCreateRequest, UserUpdateRequest } from './models';

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
        headers: Headers,
        tx?: TransactionClient,
        employeeId?: string,
        roleId?: string
    ): Promise<User> => {
        const prisma = tx || prismaClient;

        const created = await auth.api.createUser({
            body: {
                email: request.email,
                password: request.password,
                name: request.name,
                role: request.role,
                data: {
                    id: employeeId || ulid(),
                    profile: employeeId,
                },
            },
            headers,
        });

        if (!created?.user) throw new InternalServerError('Failed to create user');
        const user = created.user;

        if (employeeId && roleId) {
            const org = await auth.api.getFullOrganization({
                query: { organizationSlug: 'default' },
                headers,
            });

            if (!org) throw new InternalServerError('No default org set.');

            const role = await prisma.organizationRole.findUnique({ where: { id: roleId } });

            if (!role) throw new NotFoundError('No role found with id: ' + roleId);

            await auth.api.addMember({
                body: {
                    userId: user.id,
                    organizationId: org.id,
                    // @ts-expect-error dynamic role from DB; better-auth's type narrows to statically declared roles only
                    role: role.role,
                },
                headers,
            });
        }

        return user;
    },

    updateUser: async (request: UserUpdateRequest): Promise<User> => {
        const { id, ...data } = request;

        const user = await prismaClient.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundError('User not found');

        if (data.email) {
            const existing = await prismaClient.user.findFirst({
                where: { email: data.email, NOT: { id } },
            });
            if (existing) throw new ConflictError('A user with this email already exists');
        }

        return await prismaClient.user.update({
            where: { id },
            data,
        });
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
