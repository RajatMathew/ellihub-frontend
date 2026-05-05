import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';

import { getMailTemplateConfig } from './template-service';

import type { MailSignatureInput } from './models';

type ProfileSignatureEmployee = {
    name: string;
    email: string;
    role?: { label?: string | null; name?: string | null } | null;
} | null;

type ProfileSignatureUser = {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    profile?: string | null;
};

type ProfileSignatureSource = {
    user: ProfileSignatureUser;
    employee?: ProfileSignatureEmployee;
};

const PROFILE_SIGNATURE_TYPE = 'mailProfileSignature';

function getProfileSignatureConfigId(userId: string) {
    return `mail-profile-signature:${userId}`;
}

function parseSavedSignature(value: string | null | undefined): MailSignatureInput | null {
    if (!value) return null;

    try {
        const parsed = JSON.parse(value) as Partial<MailSignatureInput>;
        if (!parsed.name || !parsed.role || !parsed.email) return null;

        return {
            name: parsed.name,
            role: parsed.role,
            email: parsed.email.toLowerCase(),
        };
    } catch {
        return null;
    }
}

function roleFromEmployee(employee: ProfileSignatureEmployee) {
    return employee?.role?.label || employee?.role?.name || null;
}

function resolveSignature(source: ProfileSignatureSource, saved?: MailSignatureInput | null) {
    const templateSignature = getMailTemplateConfig().signature;
    const employee = source.employee ?? null;

    return {
        name: saved?.name || source.user.name || employee?.name || templateSignature.name,
        role:
            saved?.role || roleFromEmployee(employee) || source.user.role || templateSignature.role,
        email: (
            saved?.email ||
            source.user.email ||
            employee?.email ||
            templateSignature.email
        ).toLowerCase(),
    };
}

async function getSavedSignature(userId: string) {
    const saved = await prisma.configuration.findUnique({
        where: { id: getProfileSignatureConfigId(userId) },
    });

    return parseSavedSignature(saved?.value);
}

async function getProfileSource(userId: string): Promise<ProfileSignatureSource> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, profile: true },
    });

    if (!user) {
        const templateSignature = getMailTemplateConfig().signature;
        return {
            user: {
                id: userId,
                name: templateSignature.name,
                email: templateSignature.email,
                role: templateSignature.role,
            },
            employee: null,
        };
    }

    const employee = await findEmployeeForUser(user);
    return { user, employee };
}

async function findEmployeeForUser(user: ProfileSignatureUser): Promise<ProfileSignatureEmployee> {
    if (user.profile) {
        const employee = await prisma.employee.findFirst({
            where: { id: user.profile, deletedAt: null },
            include: { role: true },
        });
        if (employee) return employee;
    }

    const employeeByUserId = await prisma.employee.findFirst({
        where: { userId: user.id, deletedAt: null },
        include: { role: true },
    });
    if (employeeByUserId) return employeeByUserId;

    return prisma.employee.findFirst({
        where: { email: user.email, deletedAt: null },
        include: { role: true },
    });
}

export const MailSignatureProfileService = {
    getSignature: async (userId: string): Promise<MailSignatureInput> => {
        const [source, saved] = await Promise.all([
            getProfileSource(userId),
            getSavedSignature(userId),
        ]);
        return resolveSignature(source, saved);
    },

    saveSignature: async (
        userId: string,
        signature: MailSignatureInput,
        tx?: TransactionClient
    ): Promise<MailSignatureInput> => {
        const client = tx ?? prisma;
        const normalized = {
            name: signature.name.trim(),
            role: signature.role.trim(),
            email: signature.email.trim().toLowerCase(),
        };

        await client.configuration.upsert({
            where: { id: getProfileSignatureConfigId(userId) },
            create: {
                id: getProfileSignatureConfigId(userId),
                name: PROFILE_SIGNATURE_TYPE,
                type: 'json',
                parent: 'user',
                child: 'mail',
                key1: userId,
                key2: 'signature',
                value: JSON.stringify(normalized),
            },
            update: {
                value: JSON.stringify(normalized),
                name: PROFILE_SIGNATURE_TYPE,
                type: 'json',
                parent: 'user',
                child: 'mail',
                key1: userId,
                key2: 'signature',
            },
        });

        return normalized;
    },

    resolveSignature,
};
