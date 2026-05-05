import { TransactionClient } from '@db/internal/prismaNamespace';
import { auth } from '@lib/auth';
import { prisma as prismaClient } from '@lib/prisma';
import { MailSignatureProfileService } from '@modules/mail/signature-profile-service';
import { BadRequestError, ConflictError, InternalServerError, NotFoundError } from '@utils';
import { User as BetterAuthUser } from 'better-auth';
import { ulid } from 'ulid';

import {
    RoleCreateRequest,
    UserCreateRequest,
    UserProfileUpdateRequest,
    UserUpdateRequest,
} from './models';

import type { Department, Employee, Lookup, User as PrismaUser } from '@db/client';

const profileUserSelect = {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    image: true,
    role: true,
    profile: true,
    createdAt: true,
    updatedAt: true,
} as const;

const profileEmployeeInclude = { department: true, role: true } as const;

type ProfileUserRecord = Pick<
    PrismaUser,
    | 'id'
    | 'name'
    | 'email'
    | 'emailVerified'
    | 'image'
    | 'role'
    | 'profile'
    | 'createdAt'
    | 'updatedAt'
>;

type ProfileEmployeeRecord =
    | (Employee & {
          department: Department | null;
          role: Lookup | null;
      })
    | null;

const employeeProfileFields = [
    'phoneNumber',
    'address',
    'startDate',
    'emergencyContactName',
    'emergencyContactPhone',
    'emergencyContactRelation',
] as const;

async function findEmployeeForUser(user: Pick<ProfileUserRecord, 'id' | 'email' | 'profile'>) {
    if (user.profile) {
        const employee = await prismaClient.employee.findFirst({
            where: { id: user.profile, deletedAt: null },
            include: profileEmployeeInclude,
        });
        if (employee) return employee;
    }

    const employeeByUserId = await prismaClient.employee.findFirst({
        where: { userId: user.id, deletedAt: null },
        include: profileEmployeeInclude,
    });
    if (employeeByUserId) return employeeByUserId;

    return prismaClient.employee.findFirst({
        where: { email: user.email, deletedAt: null },
        include: profileEmployeeInclude,
    });
}

function hasEmployeeProfileInput(request: UserProfileUpdateRequest) {
    return employeeProfileFields.some((field) => {
        const value = request[field];
        return value !== undefined && value !== null;
    });
}

function getMissingProfileFields(user: ProfileUserRecord, employee: ProfileEmployeeRecord) {
    const missing: string[] = [];

    if (!user.name) missing.push('name');
    if (!user.email) missing.push('email');
    if (!employee) {
        missing.push(...employeeProfileFields);
        return missing;
    }

    if (!employee.phoneNumber) missing.push('phoneNumber');
    if (!employee.address) missing.push('address');
    if (!employee.startDate) missing.push('startDate');
    if (!employee.emergencyContactName) missing.push('emergencyContactName');
    if (!employee.emergencyContactPhone) missing.push('emergencyContactPhone');
    if (!employee.emergencyContactRelation) missing.push('emergencyContactRelation');

    return missing;
}

function toProfileResponse(
    user: ProfileUserRecord,
    employee: ProfileEmployeeRecord,
    signature: Awaited<ReturnType<typeof MailSignatureProfileService.getSignature>>
) {
    return {
        user,
        employee,
        signature,
        missingFields: getMissingProfileFields(user, employee),
    };
}

async function ensureProfileEmailAvailable(email: string, userId: string, employeeId?: string) {
    const [duplicateUser, duplicateEmployee] = await Promise.all([
        prismaClient.user.findFirst({ where: { email, NOT: { id: userId } } }),
        prismaClient.employee.findFirst({
            where: {
                email,
                deletedAt: null,
                ...(employeeId ? { NOT: { id: employeeId } } : {}),
            },
        }),
    ]);

    if (duplicateUser) throw new ConflictError('A user with this email already exists');
    if (duplicateEmployee) throw new ConflictError('An employee with this email already exists');
}

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
    ): Promise<BetterAuthUser> => {
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

    updateUser: async (request: UserUpdateRequest): Promise<BetterAuthUser> => {
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

    getCurrentProfile: async (userId: string) => {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: profileUserSelect,
        });
        if (!user) throw new NotFoundError('User not found');

        const employee = await findEmployeeForUser(user);
        const signature = await MailSignatureProfileService.getSignature(user.id);
        return toProfileResponse(user, employee, signature);
    },

    updateCurrentProfile: async (userId: string, request: UserProfileUpdateRequest) => {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: profileUserSelect,
        });
        if (!user) throw new NotFoundError('User not found');

        const employee = await findEmployeeForUser(user);
        const targetEmail = request.email ?? employee?.email ?? user.email;

        await ensureProfileEmailAvailable(targetEmail, user.id, employee?.id);

        if (!employee && hasEmployeeProfileInput(request) && !request.phoneNumber) {
            throw new BadRequestError('Phone number is required to create an employee profile');
        }

        await prismaClient.$transaction(async (tx) => {
            const userData: Partial<Pick<PrismaUser, 'name' | 'email' | 'image' | 'profile'>> = {};
            let nextEmployee: ProfileEmployeeRecord = employee;

            if (request.name !== undefined) userData.name = request.name;
            if (request.email !== undefined) userData.email = request.email;
            if (request.image !== undefined) userData.image = request.image;

            if (employee) {
                nextEmployee = await tx.employee.update({
                    where: { id: employee.id },
                    data: {
                        name: request.name ?? employee.name,
                        email: request.email ?? employee.email,
                        phoneNumber: request.phoneNumber ?? employee.phoneNumber,
                        address: request.address === undefined ? employee.address : request.address,
                        startDate:
                            request.startDate === undefined
                                ? employee.startDate
                                : request.startDate,
                        emergencyContactName:
                            request.emergencyContactName === undefined
                                ? employee.emergencyContactName
                                : request.emergencyContactName,
                        emergencyContactPhone:
                            request.emergencyContactPhone === undefined
                                ? employee.emergencyContactPhone
                                : request.emergencyContactPhone,
                        emergencyContactRelation:
                            request.emergencyContactRelation === undefined
                                ? employee.emergencyContactRelation
                                : request.emergencyContactRelation,
                        userId: employee.userId ?? user.id,
                    },
                    include: profileEmployeeInclude,
                });

                if (user.profile !== employee.id) userData.profile = employee.id;
            } else if (request.phoneNumber) {
                nextEmployee = await tx.employee.create({
                    data: {
                        id: ulid(),
                        name: request.name ?? user.name,
                        email: request.email ?? user.email,
                        phoneNumber: request.phoneNumber,
                        address: request.address ?? null,
                        startDate: request.startDate ?? null,
                        emergencyContactName: request.emergencyContactName ?? null,
                        emergencyContactPhone: request.emergencyContactPhone ?? null,
                        emergencyContactRelation: request.emergencyContactRelation ?? null,
                        userId: user.id,
                    },
                    include: profileEmployeeInclude,
                });
                userData.profile = nextEmployee.id;
            }

            const nextUser =
                Object.keys(userData).length > 0
                    ? await tx.user.update({
                          where: { id: user.id },
                          data: userData,
                          select: profileUserSelect,
                      })
                    : user;

            if (request.signature) {
                await MailSignatureProfileService.saveSignature(user.id, request.signature, tx);
            }

            return { user: nextUser, employee: nextEmployee };
        });

        return UserService.getCurrentProfile(userId);
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
