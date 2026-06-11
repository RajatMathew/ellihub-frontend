import { randomUUID } from 'crypto';

import { accountant, adminRole, dev, member, owner, pm, user } from './permissions';
import { prisma } from './prisma';

const DEFAULT_ORGANIZATION_SLUG = 'default';

function getOrganizationRoleForProductRole(role: string | null | undefined) {
    switch (role) {
        case 'dev':
            return 'dev';
        case 'admin':
            return 'admin';
        case 'accountant':
            return 'accountant';
        case 'pm':
            return 'pm';
        case 'user':
        default:
            return 'user';
    }
}

/**
 * Initialize default roles for a newly created organization
 */
export async function initializeOrganizationRoles(organizationId: string) {
    try {
        await prisma.$transaction(async (tx) => {
            for (const [role, permission] of Object.entries({
                dev: dev.statements,
                admin: adminRole.statements,
                accountant: accountant.statements,
                pm: pm.statements,
                user: user.statements,
                owner: owner.statements,
                member: member.statements,
            })) {
                const existing = await tx.organizationRole.findFirst({
                    where: { organizationId, role },
                });

                if (existing) {
                    await tx.organizationRole.update({
                        where: { id: existing.id },
                        data: { permission: JSON.stringify(permission) },
                    });
                    continue;
                }

                await tx.organizationRole.create({
                    data: {
                        id: randomUUID(),
                        organizationId,
                        role,
                        permission: JSON.stringify(permission),
                    },
                });
            }
        });
    } catch (error) {
        console.error(`Failed to initialize roles for organization ${organizationId}:`, error);
        throw error;
    }
}

export async function syncDefaultOrganizationAccess() {
    const organization = await prisma.organization.findUnique({
        where: { slug: DEFAULT_ORGANIZATION_SLUG },
        select: { id: true },
    });

    if (!organization) return;

    await initializeOrganizationRoles(organization.id);

    const users = await prisma.user.findMany({
        select: { id: true, role: true },
    });
    const members = await prisma.member.findMany({
        where: { organizationId: organization.id },
        select: { id: true, userId: true, role: true },
    });
    const memberByUserId = new Map(members.map((item) => [item.userId, item]));

    const membershipWrites = users.flatMap((user) => {
        const desiredRole = getOrganizationRoleForProductRole(user.role);
        const existing = memberByUserId.get(user.id);

        if (!existing) {
            return [
                prisma.member.create({
                    data: {
                        id: randomUUID(),
                        organizationId: organization.id,
                        userId: user.id,
                        role: desiredRole,
                        createdAt: new Date(),
                    },
                }),
            ];
        }

        if (existing.role === desiredRole) {
            return [];
        }

        return [
            prisma.member.update({
                where: { id: existing.id },
                data: { role: desiredRole },
            }),
        ];
    });

    if (membershipWrites.length) {
        await prisma.$transaction(membershipWrites);
    }
}
