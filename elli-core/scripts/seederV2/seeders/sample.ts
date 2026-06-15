import { PaymentTerms, ProjectStatus, VendorStatus, GCStatus } from '@db/enums';
import { auth } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { FileService } from '@modules/file/services';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

import { adminSeed } from '../data';
import { seedLog } from '../reporter';

const sampleSeed = {
    departmentName: 'Sample Department',
    pmName: 'Sample PM',
    pmEmail: 'sample.pm@elli.com',
    accountantName: 'Sample Accountant',
    accountantEmail: 'sample.accountant@elli.com',
    password: 'password123',
    vendorName: 'Sample Vendor',
    gcName: 'Sample GC',
    contactName: 'Sample Contact',
    contactEmail: 'sample.contact@example.com',
    projectName: 'Sample Project',
    projectJobNumber: 'SAMPLE-001',
} as const;

const getLookupId = async (type: string, label: string): Promise<string> => {
    const lookup = await prisma.lookup.findUnique({ where: { type_label: { type, label } } });
    if (!lookup) throw new Error(`Missing lookup ${type}:${label}`);
    return lookup.id;
};

const getDefaultOrganization = async () => {
    const organization = await prisma.organization.findUnique({
        where: { slug: adminSeed.organizationSlug },
    });
    if (!organization) throw new Error('Default organization not found.');
    return organization;
};

export const seedSampleProductionData = async (adminUserId: string) => {
    seedLog.section('Sample data');
    seedLog.start('sample:data', 'Sample directory, HR, and project records');

    const organization = await getDefaultOrganization();
    const [pmRoleId, accountantRoleId, vendorTypeId, gcTypeId, projectStageId, projectDivisionId] =
        await Promise.all([
            getLookupId(LookupType.PROFESSIONAL_ROLE, 'Project Manager'),
            getLookupId(LookupType.PROFESSIONAL_ROLE, 'Accountant'),
            getLookupId(LookupType.VENDOR_TYPE, 'MATERIAL'),
            getLookupId(LookupType.GC_TYPE, 'Private'),
            getLookupId(LookupType.PROJECT_STAGE, 'ONBOARDING'),
            getLookupId(LookupType.PROJECT_DIVISION, 'SCA'),
        ]);

    const createdPmUser = await auth.api.createUser({
        body: {
            email: sampleSeed.pmEmail,
            password: sampleSeed.password,
            name: sampleSeed.pmName,
            role: 'pm',
            data: { id: generateNanoId() },
        },
    });

    if (!createdPmUser?.user) throw new Error(`Failed to create ${sampleSeed.pmEmail}`);

    const createdAccountantUser = await auth.api.createUser({
        body: {
            email: sampleSeed.accountantEmail,
            password: sampleSeed.password,
            name: sampleSeed.accountantName,
            role: 'accountant',
            data: { id: generateNanoId() },
        },
    });

    if (!createdAccountantUser?.user) {
        throw new Error(`Failed to create ${sampleSeed.accountantEmail}`);
    }

    await prisma.$transaction(async (tx) => {
        await tx.member.createMany({
            data: [
                {
                    id: generateNanoId(),
                    organizationId: organization.id,
                    userId: createdPmUser.user.id,
                    role: 'pm',
                    createdAt: new Date(),
                },
                {
                    id: generateNanoId(),
                    organizationId: organization.id,
                    userId: createdAccountantUser.user.id,
                    role: 'accountant',
                    createdAt: new Date(),
                },
            ],
        });

        const department = await tx.department.create({
            data: {
                id: generateNanoId(),
                name: sampleSeed.departmentName,
                description: 'Sample department created by production seed.',
            },
        });

        const pm = await tx.employee.create({
            data: {
                id: generateNanoId(),
                name: sampleSeed.pmName,
                email: sampleSeed.pmEmail,
                phoneNumber: '000-000-0000',
                roleId: pmRoleId,
                departmentId: department.id,
                userId: createdPmUser.user.id,
            },
        });

        const accountant = await tx.employee.create({
            data: {
                id: generateNanoId(),
                name: sampleSeed.accountantName,
                email: sampleSeed.accountantEmail,
                phoneNumber: '000-000-0000',
                roleId: accountantRoleId,
                departmentId: department.id,
                userId: createdAccountantUser.user.id,
            },
        });

        await tx.user.update({
            where: { id: createdPmUser.user.id },
            data: { emailVerified: true, profile: pm.id },
        });

        await tx.user.update({
            where: { id: createdAccountantUser.user.id },
            data: { emailVerified: true, profile: accountant.id },
        });

        await FileService.createEmployeeFolder(tx, pm.id, pm.name, adminUserId);
        await FileService.createEmployeeFolder(tx, accountant.id, accountant.name, adminUserId);

        const vendor = await tx.vendor.create({
            data: {
                id: generateNanoId(),
                name: sampleSeed.vendorName,
                typeId: vendorTypeId,
                categoryTags: ['Sample'],
                status: VendorStatus.ACTIVE,
                paymentTerms: PaymentTerms.NET_30,
                notes: 'Sample vendor created by production seed.',
            },
        });

        await FileService.createVendorFolder(tx, vendor.id, vendor.name, adminUserId);

        const gc = await tx.generalContractor.create({
            data: {
                id: generateNanoId(),
                name: sampleSeed.gcName,
                gcTypeId,
                status: GCStatus.ACTIVE,
                paymentTerms: PaymentTerms.NET_30,
                retainagePercent: 10,
            },
        });

        await FileService.createGcFolder(tx, gc.id, gc.name, adminUserId);

        await tx.contact.create({
            data: {
                id: generateNanoId(),
                fullName: sampleSeed.contactName,
                professionalRoleId: pmRoleId,
                email: sampleSeed.contactEmail,
                phoneNumber: '000-000-0000',
                tags: ['Sample'],
                isPrimary: true,
                generalContractorId: gc.id,
            },
        });

        const project = await tx.project.create({
            data: {
                id: generateNanoId(),
                name: sampleSeed.projectName,
                description: 'Sample project created by production seed.',
                jobNumber: sampleSeed.projectJobNumber,
                stageId: projectStageId,
                divisionId: projectDivisionId,
                status: ProjectStatus.ACTIVE,
                gcId: gc.id,
                leadPMId: pm.id,
                contractValue: 100000,
                contractType: 'Lump Sum',
                retainagePercent: 10,
                targetBudgetPercent: 15,
                taxRate: 0,
                paymentTerms: PaymentTerms.NET_30,
                tcoDate: new Date('2026-01-01T00:00:00.000Z'),
            },
        });

        await tx.projectTeamMember.create({
            data: {
                employeeId: pm.id,
                projectId: project.id,
                role: 'Lead PM',
                isLead: true,
            },
        });

        await FileService.createProjectFolders(tx, project.id, project.name, adminUserId);
    });

    seedLog.done('sample:data', 'Created sample records');
    seedLog.table('Sample records', [
        { label: 'Department', value: sampleSeed.departmentName },
        { label: 'PM', value: `${sampleSeed.pmName} <${sampleSeed.pmEmail}>` },
        {
            label: 'Accountant',
            value: `${sampleSeed.accountantName} <${sampleSeed.accountantEmail}>`,
        },
        { label: 'Password', value: sampleSeed.password },
        { label: 'Vendor', value: sampleSeed.vendorName },
        { label: 'GC', value: sampleSeed.gcName },
        { label: 'Contact', value: sampleSeed.contactName },
        { label: 'Project', value: `${sampleSeed.projectJobNumber} - ${sampleSeed.projectName}` },
    ]);
};
