import { prisma } from '@lib/prisma';

import { lookupSeeds } from './data';

type GuardCheck = {
    name: string;
    count: () => Promise<number>;
};

const runGuardChecks = async (checks: GuardCheck[]) => {
    const failures: string[] = [];

    for (const check of checks) {
        const count = await check.count();
        if (count > 0) failures.push(`${check.name} (${count})`);
    }

    if (failures.length > 0) {
        throw new Error(
            [
                'Seed aborted because target data already exists.',
                'Refusing to merge seed data into a non-empty database.',
                `Existing data: ${failures.join(', ')}`,
            ].join('\n')
        );
    }
};

const lookupGuardChecks = (): GuardCheck[] =>
    Object.keys(lookupSeeds).map((type) => ({
        name: `lookup:${type}`,
        count: () => prisma.lookup.count({ where: { type } }),
    }));

export const assertProductionSeedTargetsEmpty = async () => {
    await runGuardChecks([
        { name: 'user', count: () => prisma.user.count() },
        { name: 'organization', count: () => prisma.organization.count() },
        { name: 'member', count: () => prisma.member.count() },
        { name: 'file', count: () => prisma.file.count() },
        { name: 'costCodeCategory', count: () => prisma.costCodeCategory.count() },
        { name: 'costCode', count: () => prisma.costCode.count() },
        ...lookupGuardChecks(),
    ]);
};

export const assertProductionSampleSeedTargetsEmpty = async () => {
    await runGuardChecks([
        { name: 'department', count: () => prisma.department.count() },
        { name: 'employee', count: () => prisma.employee.count() },
        { name: 'vendor', count: () => prisma.vendor.count() },
        { name: 'generalContractor', count: () => prisma.generalContractor.count() },
        { name: 'contact', count: () => prisma.contact.count() },
        { name: 'project', count: () => prisma.project.count() },
        { name: 'projectTeamMember', count: () => prisma.projectTeamMember.count() },
    ]);
};

export const assertDevelopmentSeedTargetsEmpty = async () => {
    await runGuardChecks([
        { name: 'user', count: () => prisma.user.count() },
        { name: 'organization', count: () => prisma.organization.count() },
        { name: 'member', count: () => prisma.member.count() },
        { name: 'file', count: () => prisma.file.count() },
        { name: 'costCodeCategory', count: () => prisma.costCodeCategory.count() },
        { name: 'costCode', count: () => prisma.costCode.count() },
        { name: 'department', count: () => prisma.department.count() },
        { name: 'employee', count: () => prisma.employee.count() },
        { name: 'vendor', count: () => prisma.vendor.count() },
        { name: 'generalContractor', count: () => prisma.generalContractor.count() },
        { name: 'contact', count: () => prisma.contact.count() },
        { name: 'project', count: () => prisma.project.count() },
        { name: 'projectTeamMember', count: () => prisma.projectTeamMember.count() },
        { name: 'primeContract', count: () => prisma.primeContract.count() },
        { name: 'projectSchedule', count: () => prisma.projectSchedule.count() },
        { name: 'rFQ', count: () => prisma.rFQ.count() },
        { name: 'rFQDeliverable', count: () => prisma.rFQDeliverable.count() },
        { name: 'rFQVendorQuote', count: () => prisma.rFQVendorQuote.count() },
        { name: 'purchaseOrder', count: () => prisma.purchaseOrder.count() },
        { name: 'purchaseOrderLineItem', count: () => prisma.purchaseOrderLineItem.count() },
        { name: 'invoice', count: () => prisma.invoice.count() },
        { name: 'subChangeOrder', count: () => prisma.subChangeOrder.count() },
        { name: 'subCOLineItem', count: () => prisma.subCOLineItem.count() },
        ...lookupGuardChecks(),
    ]);
};

export const assertDevelopmentEnvironment = () => {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Development seed is disabled when NODE_ENV="production".');
    }
};
