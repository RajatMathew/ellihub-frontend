import { Prisma } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { auth } from '@lib/auth';
import { prisma as prismaClient } from '@lib/prisma';
import { MailSignatureProfileService } from '@modules/mail/signature-profile-service';
import { BadRequestError, ConflictError, InternalServerError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { User as BetterAuthUser } from 'better-auth';

import {
    AppRole,
    RoleCreateRequest,
    UserCreateRequest,
    UserPasswordResetRequest,
    UserProfileUpdateRequest,
    UserRoleUpdateRequest,
    UserSuspendRequest,
    UserUpdateRequest,
} from './models';

import type { Department, Employee, Lookup, User as PrismaUser } from '@db/client';
import type { PaginationParams } from '@middleware';

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

const listUserSelect = {
    id: true,
    name: true,
    email: true,
    emailVerified: true,
    image: true,
    role: true,
    banned: true,
    banReason: true,
    banExpires: true,
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

const DEFAULT_ORGANIZATION_SLUG = 'default';

function getOrganizationRoleForUserRole(role: AppRole) {
    return role;
}

async function getTargetOrganizationId(headers: Headers) {
    const session = await auth.api.getSession({ headers });
    if (session?.session.activeOrganizationId) return session.session.activeOrganizationId;

    const org = await auth.api.getFullOrganization({
        query: { organizationSlug: DEFAULT_ORGANIZATION_SLUG },
        headers,
    });

    if (!org) throw new InternalServerError('No default organization found.');

    return org.id;
}

async function syncOrganizationMembership(
    userId: string,
    role: UserCreateRequest['role'],
    headers: Headers
) {
    const organizationId = await getTargetOrganizationId(headers);
    const organizationRole = getOrganizationRoleForUserRole(role);
    const member = await prismaClient.member.findFirst({
        where: { userId, organizationId },
    });

    if (!member) {
        await auth.api.addMember({
            body: {
                userId,
                organizationId,
                role: organizationRole,
            },
            headers,
        });
        return;
    }

    if (member.role !== organizationRole) {
        await auth.api.updateMemberRole({
            body: {
                memberId: member.id,
                organizationId,
                role: organizationRole,
            },
            headers,
        });
    }
}

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

async function assertCanChangeUserRole(userId: string, nextRole: AppRole) {
    if (nextRole === 'pm') return;

    const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, profile: true },
    });
    if (!user) throw new NotFoundError('User not found');

    const employee = await prismaClient.employee.findFirst({
        where: {
            deletedAt: null,
            OR: [
                { userId },
                ...(user.profile ? [{ id: user.profile }] : []),
                { email: user.email },
            ],
        },
        select: { id: true, name: true },
    });

    if (!employee) return;

    const [assignments, directLeadProjects] = await Promise.all([
        prismaClient.projectTeamMember.findMany({
            where: {
                employeeId: employee.id,
                project: { deletedAt: null },
                OR: [{ isLead: true }, { role: { in: ['Lead PM', 'PM'] } }],
            },
            select: {
                role: true,
                isLead: true,
                project: { select: { id: true, name: true, leadPMId: true } },
            },
        }),
        prismaClient.project.findMany({
            where: { leadPMId: employee.id, deletedAt: null },
            select: { id: true, name: true },
        }),
    ]);

    const leadProjects = assignments.filter(
        (assignment) => assignment.isLead || assignment.project.leadPMId === employee.id
    );
    const pmProjects = assignments.filter(
        (assignment) =>
            !assignment.isLead &&
            assignment.project.leadPMId !== employee.id &&
            assignment.role === 'PM'
    );

    const directLeadProjectIds = new Set(directLeadProjects.map((project) => project.id));
    const missingLeadProjects = directLeadProjects.filter(
        (project) =>
            !leadProjects.some((assignment) => assignment.project.id === project.id) &&
            !pmProjects.some((assignment) => assignment.project.id === project.id)
    );

    if (leadProjects.length === 0 && pmProjects.length === 0 && missingLeadProjects.length === 0) {
        return;
    }

    const projectNames = [
        ...leadProjects.map((assignment) => assignment.project),
        ...missingLeadProjects,
        ...pmProjects
            .filter((assignment) => !directLeadProjectIds.has(assignment.project.id))
            .map((assignment) => assignment.project),
    ]
        .map((project) => project.name)
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
    const blockedCount = leadProjects.length + missingLeadProjects.length + pmProjects.length;
    const extraCount = blockedCount > 3 ? ` and ${blockedCount - 3} more` : '';
    const roleText =
        leadProjects.length > 0 || missingLeadProjects.length > 0
            ? pmProjects.length > 0
                ? 'Lead PM/PM'
                : 'Lead PM'
            : 'PM';

    throw new BadRequestError(
        `${employee.name} is assigned as ${roleText} on ${projectNames}${extraCount}. Reassign their project role before changing their auth role.`
    );
}

export const UserService = {
    getUser: async (id: string) => {
        const user = await prismaClient.user.findUnique({
            where: { id },
            select: listUserSelect,
        });
        if (!user) throw new NotFoundError('User not found');
        return user;
    },

    getAllUsers: async (headers: Headers, pagination: PaginationParams) => {
        await auth.api.listUsers({
            query: {
                limit: 1,
                offset: 0,
            },
            headers,
        });

        const { filter, skip, take, sortBy, sortOrder, search } = pagination;
        const role =
            filter?.role === 'dev' ||
            filter?.role === 'admin' ||
            filter?.role === 'accountant' ||
            filter?.role === 'pm' ||
            filter?.role === 'user'
                ? filter.role
                : undefined;
        const status =
            filter?.status === 'active' || filter?.status === 'suspended'
                ? filter.status
                : undefined;
        const emailStatus =
            filter?.emailStatus === 'verified' || filter?.emailStatus === 'pending'
                ? filter.emailStatus
                : undefined;

        const filters: Prisma.UserWhereInput[] = [];

        if (role) filters.push({ role });
        if (status === 'suspended') filters.push({ banned: true });
        if (status === 'active') filters.push({ OR: [{ banned: false }, { banned: null }] });
        if (emailStatus) filters.push({ emailVerified: emailStatus === 'verified' });
        if (search) {
            filters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                ],
            });
        }

        const whereClause: Prisma.UserWhereInput = filters.length ? { AND: filters } : {};

        const [total, users] = await prismaClient.$transaction([
            prismaClient.user.count({ where: whereClause }),
            prismaClient.user.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof PrismaUser]: sortOrder },
                select: listUserSelect,
            }),
        ]);

        return { users, total };
    },

    createUser: async (
        request: UserCreateRequest,
        headers: Headers,
        tx?: TransactionClient,
        employeeId?: string
    ): Promise<BetterAuthUser> => {
        const prisma = tx || prismaClient;
        const existingUser = await prisma.user.findUnique({ where: { email: request.email } });
        if (existingUser) throw new ConflictError('A user with this email already exists');

        const created = await auth.api.createUser({
            body: {
                email: request.email,
                password: request.password,
                name: request.name,
                role: request.role,
                data: {
                    id: generateNanoId(),
                    ...(employeeId ? { profile: employeeId } : {}),
                },
            },
            headers,
        });

        if (!created?.user) throw new InternalServerError('Failed to create user');
        const user = created.user;

        try {
            await syncOrganizationMembership(user.id, request.role, headers);
        } catch (error) {
            await auth.api
                .removeUser({
                    body: { userId: user.id },
                    headers,
                })
                .catch((cleanupError) => {
                    console.error(
                        'Failed to clean up user after organization assignment failed:',
                        cleanupError
                    );
                });
            throw error;
        }

        return user;
    },

    updateUser: async (request: UserUpdateRequest, headers: Headers): Promise<BetterAuthUser> => {
        const { id, role, ...data } = request;
        await assertCanChangeUserRole(id, role);

        const updateResult = await auth.api.adminUpdateUser({
            body: {
                userId: id,
                data,
            },
            headers,
        });

        if (!updateResult) throw new InternalServerError('Failed to update user');

        const roleResult = await auth.api.setRole({
            body: {
                userId: id,
                role,
            },
            headers,
        });

        if (!roleResult?.user) throw new InternalServerError('Failed to update user role');

        await syncOrganizationMembership(id, role, headers);

        return roleResult.user;
    },

    updateUserRole: async (
        userId: string,
        request: UserRoleUpdateRequest,
        headers: Headers
    ): Promise<BetterAuthUser> => {
        await assertCanChangeUserRole(userId, request.role);

        const roleResult = await auth.api.setRole({
            body: {
                userId,
                role: request.role,
            },
            headers,
        });

        if (!roleResult?.user) throw new InternalServerError('Failed to update user role');

        await syncOrganizationMembership(userId, request.role, headers);

        return roleResult.user;
    },

    resetUserPassword: async (
        userId: string,
        request: UserPasswordResetRequest,
        headers: Headers
    ) => {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) throw new NotFoundError('User not found');

        const result = await auth.api.setUserPassword({
            body: {
                userId,
                newPassword: request.newPassword,
            },
            headers,
        });

        if (!result?.status) throw new InternalServerError('Failed to reset password');

        if (request.revokeSessions) {
            await auth.api.revokeUserSessions({
                body: { userId },
                headers,
            });
        }

        return result;
    },

    suspendUser: async (
        userId: string,
        request: UserSuspendRequest,
        headers: Headers
    ): Promise<BetterAuthUser> => {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) throw new NotFoundError('User not found');

        const result = await auth.api.banUser({
            body: {
                userId,
                ...(request.banReason ? { banReason: request.banReason } : {}),
                ...(request.banExpiresIn ? { banExpiresIn: request.banExpiresIn } : {}),
            },
            headers,
        });

        if (!result?.user) throw new InternalServerError('Failed to suspend user');
        return result.user;
    },

    unsuspendUser: async (userId: string, headers: Headers): Promise<BetterAuthUser> => {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user) throw new NotFoundError('User not found');

        const result = await auth.api.unbanUser({
            body: { userId },
            headers,
        });

        if (!result?.user) throw new InternalServerError('Failed to unsuspend user');
        return result.user;
    },

    reactivateUserForEmployee: async (
        userId: string,
        request: UserCreateRequest,
        headers: Headers,
        employeeId: string
    ): Promise<PrismaUser> => {
        const user = await prismaClient.user.findUnique({
            where: { id: userId },
            select: { id: true, banned: true },
        });
        if (!user) throw new NotFoundError('User not found');

        await prismaClient.user.update({
            where: { id: userId },
            data: {
                name: request.name,
                email: request.email,
                profile: employeeId,
            },
        });

        const roleResult = await auth.api.setRole({
            body: {
                userId,
                role: request.role,
            },
            headers,
        });
        if (!roleResult?.user) throw new InternalServerError('Failed to update user role');

        await syncOrganizationMembership(userId, request.role, headers);

        const passwordResult = await auth.api.setUserPassword({
            body: {
                userId,
                newPassword: request.password,
            },
            headers,
        });
        if (!passwordResult?.status) throw new InternalServerError('Failed to reset password');

        if (user.banned) {
            const unbanResult = await auth.api.unbanUser({
                body: { userId },
                headers,
            });
            if (!unbanResult?.user) throw new InternalServerError('Failed to restore user access');
        }

        await auth.api.revokeUserSessions({
            body: { userId },
            headers,
        });

        const updated = await prismaClient.user.findUnique({ where: { id: userId } });
        if (!updated) throw new NotFoundError('User not found');
        return updated;
    },

    removeUser: async (userId: string, headers: Headers) => {
        await auth.api.removeUser({
            body: { userId },
            headers,
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
                        id: generateNanoId(),
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
