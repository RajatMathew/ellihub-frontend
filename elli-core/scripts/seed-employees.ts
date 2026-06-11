import { auth } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { FileService } from '@modules/file/services';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

type EmployeeSeed = {
    name: string;
    email: string;
    password: string;
    authRole: 'pm' | 'accountant' | 'user';
    professionalRole: string;
    phoneNumber: string;
};

const employeeSeeds: EmployeeSeed[] = [
    {
        name: 'Tomasz',
        email: 'tomasz@elli.com',
        password: 'password123',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        phoneNumber: '000-000-0101',
    },
    {
        name: 'Maya Patel',
        email: 'maya.patel@elli.com',
        password: 'password123',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        phoneNumber: '000-000-0104',
    },
    {
        name: 'Daniel Rivera',
        email: 'daniel.rivera@elli.com',
        password: 'password123',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        phoneNumber: '000-000-0105',
    },
    {
        name: 'Priya Shah',
        email: 'priya.shah@elli.com',
        password: 'password123',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        phoneNumber: '000-000-0106',
    },
    {
        name: 'Omar Hassan',
        email: 'omar.hassan@elli.com',
        password: 'password123',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        phoneNumber: '000-000-0107',
    },
    {
        name: 'Seed Accountant',
        email: 'accountant@elli.com',
        password: 'password123',
        authRole: 'accountant',
        professionalRole: 'Accountant',
        phoneNumber: '000-000-0102',
    },
    {
        name: 'Seed User',
        email: 'user@elli.com',
        password: 'password123',
        authRole: 'user',
        professionalRole: 'Site Superintendent',
        phoneNumber: '000-000-0103',
    },
];

const ensureProfessionalRole = async (label: string): Promise<string> => {
    const existing = await prisma.lookup.findUnique({
        where: { type_label: { type: LookupType.PROFESSIONAL_ROLE, label } },
    });
    if (existing) return existing.id;

    const created = await prisma.lookup.create({
        data: { id: generateNanoId(), type: LookupType.PROFESSIONAL_ROLE, label },
    });
    return created.id;
};

const ensureAuthUser = async (seed: EmployeeSeed): Promise<string> => {
    const existing = await prisma.user.findUnique({ where: { email: seed.email } });
    if (existing) {
        const needsUpdate =
            existing.name !== seed.name ||
            existing.role !== seed.authRole ||
            !existing.emailVerified;
        if (needsUpdate) {
            await prisma.user.update({
                where: { id: existing.id },
                data: { name: seed.name, role: seed.authRole, emailVerified: true },
            });
        }
        return existing.id;
    }

    const created = await auth.api.createUser({
        body: {
            email: seed.email,
            password: seed.password,
            name: seed.name,
            role: seed.authRole,
            data: { id: generateNanoId() },
        },
    });

    if (!created?.user) throw new Error(`Failed to create auth user ${seed.email}`);
    return created.user.id;
};

const ensureOrganizationMembership = async (userId: string, role: string) => {
    const organization = await prisma.organization.findUnique({ where: { slug: 'default' } });
    if (!organization) {
        throw new Error('Default organization not found. Run the user seeder first.');
    }

    const existing = await prisma.member.findFirst({
        where: { organizationId: organization.id, userId },
    });
    if (existing) {
        if (existing.role !== role) {
            await prisma.member.update({ where: { id: existing.id }, data: { role } });
        }
        return;
    }

    await prisma.member.create({
        data: {
            id: generateNanoId(),
            organizationId: organization.id,
            userId,
            role,
            createdAt: new Date(),
        },
    });
};

const ensureEmployeeFolder = async (employeeId: string, name: string, userId: string) => {
    const employeesRootFolder = await FileService.getRootFolder('employees');
    const existing = await prisma.file.findFirst({
        where: { parentId: employeesRootFolder.id, name: employeeId, type: 'FOLDER' },
        select: { id: true },
    });
    if (existing) return;

    await prisma.$transaction(async (tx) => {
        await FileService.createEmployeeFolder(tx, employeeId, name, userId);
    });
};

export const seedEmployees = async () => {
    console.log('Seeding auth-backed employees...');

    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@elli.com' } });
    if (!adminUser)
        throw new Error('Admin user admin@elli.com not found. Run the user seeder first.');

    for (const seed of employeeSeeds) {
        const roleId = await ensureProfessionalRole(seed.professionalRole);
        const userId = await ensureAuthUser(seed);
        await ensureOrganizationMembership(userId, seed.authRole);

        const existingEmployee = await prisma.employee.findFirst({
            where: {
                deletedAt: null,
                OR: [{ email: { equals: seed.email, mode: 'insensitive' } }, { userId }],
            },
        });

        const employee = existingEmployee
            ? await prisma.employee.update({
                  where: { id: existingEmployee.id },
                  data: {
                      name: seed.name,
                      email: seed.email,
                      phoneNumber: seed.phoneNumber,
                      roleId,
                      userId,
                  },
              })
            : await prisma.employee.create({
                  data: {
                      id: generateNanoId(),
                      name: seed.name,
                      email: seed.email,
                      phoneNumber: seed.phoneNumber,
                      roleId,
                      userId,
                  },
              });

        await prisma.user.update({
            where: { id: userId },
            data: { profile: employee.id },
        });
        await ensureEmployeeFolder(employee.id, employee.name, adminUser.id);

        console.log(`Seeded ${seed.authRole} employee: ${employee.name} <${employee.email}>`);
    }

    console.log('Employee seed complete!');
};

if (process.argv[1]?.endsWith('seed-employees.ts')) {
    seedEmployees()
        .catch((e) => {
            console.error('Employee seed failed:', e);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
