import { auth } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { generateNanoId } from '@utils/generateNanoId';

import {
    adminSeed,
    costCodeCategorySeeds,
    costCodeSeeds,
    lookupSeeds,
    rootSubFolders,
} from '../data';
import { seedLog } from '../reporter';

export const seedAdminAndOrganization = async () => {
    seedLog.start('prod:admin', 'Admin user and default organization');

    const created = await auth.api.createUser({
        body: {
            email: adminSeed.email,
            password: adminSeed.password,
            name: adminSeed.name,
            role: adminSeed.role,
            data: { id: generateNanoId() },
        },
    });

    if (!created?.user) throw new Error('Failed to create admin user.');

    const organization = await auth.api.createOrganization({
        body: {
            name: adminSeed.organizationName,
            slug: adminSeed.organizationSlug,
            userId: created.user.id,
        },
    });

    if (!organization) throw new Error('Failed to create default organization.');

    seedLog.done('prod:admin', `Created ${adminSeed.email}`);
    return created.user.id;
};

export const seedRootFolders = async (adminUserId: string) => {
    seedLog.start('prod:folders', 'Root folder tree');

    const rootFolder = await prisma.file.create({
        data: {
            id: generateNanoId(),
            createdBy: adminUserId,
            name: 'root',
            type: 'FOLDER',
            isDeletable: false,
        },
    });

    for (const folder of rootSubFolders) {
        await prisma.file.create({
            data: {
                id: generateNanoId(),
                createdBy: adminUserId,
                name: folder.name,
                displayName: folder.displayName,
                parentId: rootFolder.id,
                type: 'FOLDER',
                isDeletable: false,
            },
        });
    }

    seedLog.done('prod:folders', `Created root + ${rootSubFolders.length} folders`);
};

export const seedLookups = async () => {
    seedLog.start('prod:lookups', 'Lookup values');
    let createdCount = 0;

    for (const [type, labels] of Object.entries(lookupSeeds)) {
        for (const label of labels) {
            await prisma.lookup.create({
                data: {
                    id: generateNanoId(),
                    type,
                    label,
                },
            });
            createdCount += 1;
        }
    }

    seedLog.done('prod:lookups', `Created ${createdCount} lookup values`);
};

export const seedCostCodes = async () => {
    seedLog.start('prod:cost-codes', 'Cost code catalogue');

    const categoryIdsByName = new Map<string, string>();

    for (const category of costCodeCategorySeeds) {
        const created = await prisma.costCodeCategory.create({
            data: {
                id: generateNanoId(),
                name: category.name,
                description: category.description,
            },
        });
        categoryIdsByName.set(category.name, created.id);
    }

    for (const costCode of costCodeSeeds) {
        const categoryId = categoryIdsByName.get(costCode.category);
        if (!categoryId) throw new Error(`Missing cost code category: ${costCode.category}`);

        await prisma.costCode.create({
            data: {
                id: generateNanoId(),
                code: costCode.code,
                name: costCode.name,
                description: costCode.description,
                costCodeCategoryId: categoryId,
            },
        });
    }

    seedLog.done(
        'prod:cost-codes',
        `Created ${costCodeCategorySeeds.length} categories and ${costCodeSeeds.length} cost codes`
    );
};

export const seedProductionData = async () => {
    const adminUserId = await seedAdminAndOrganization();
    await seedRootFolders(adminUserId);
    await seedLookups();
    await seedCostCodes();

    return { adminUserId };
};
