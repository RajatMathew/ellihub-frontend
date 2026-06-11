import { prisma } from '@lib/prisma';
import { generateNanoId } from '@utils/generateNanoId';

export const seedRootFolder = async () => {
    let rootFolder = await prisma.file.findFirst({
        where: {
            name: 'root',
            type: 'FOLDER',
        },
    });

    const adminUser = await prisma.user.findUnique({
        where: {
            email: 'admin@elli.com',
        },
    });

    if (!adminUser) {
        throw new Error('Admin user admin@elli.com not found. Run the user seeder first.');
    }

    if (!rootFolder) {
        rootFolder = await prisma.file.create({
            data: {
                id: generateNanoId(),
                createdBy: adminUser.id,
                name: 'root',
                type: 'FOLDER',
                isDeletable: false,
            },
        });

        console.log('Created root folder.');
    } else console.log('Root folder already exists');

    const rootSubFolders = [
        { name: 'projects', displayName: 'Projects' },
        { name: 'employees', displayName: 'Employees' },
        { name: 'gc', displayName: 'General Contractors' },
        { name: 'vendor', displayName: 'Vendors' },
        { name: 'temp', displayName: 'Temp' },
    ];

    for (const folder of rootSubFolders) {
        const subFolder = await prisma.file.findFirst({
            where: {
                name: {
                    equals: folder.name,
                    mode: 'insensitive',
                },
                parentId: rootFolder?.id,
                type: 'FOLDER',
            },
        });

        if (!subFolder) {
            await prisma.file.create({
                data: {
                    id: generateNanoId(),
                    createdBy: adminUser.id,
                    name: folder.name,
                    displayName: folder.displayName,
                    parentId: rootFolder.id,
                    type: 'FOLDER',
                    isDeletable: false,
                },
            });

            console.log(`Created ${folder.name} folder`);
        } else console.log(`${folder.name} already exists`);
    }
};

if (process.argv[1]?.endsWith('seed-root-folder.ts')) {
    seedRootFolder().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
