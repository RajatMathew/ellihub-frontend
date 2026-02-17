import { prisma } from '@lib/prisma';
import { ulid } from 'ulid';

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

    if (!rootFolder) {
        rootFolder = await prisma.file.create({
            data: {
                id: ulid(),
                createdBy: adminUser!.id,
                name: 'root',
                type: 'FOLDER',
                isDeletable: false,
            },
        });

        console.log('Created root folder.');
    } else console.log('Root folder already exists');

    const rootSubFolders = ['projects', 'employees', 'gc'];

    for (const folder of rootSubFolders) {
        const subFolder = await prisma.file.findFirst({
            where: {
                name: {
                    equals: folder,
                    mode: 'insensitive',
                },
                parentId: rootFolder?.id,
                type: 'FOLDER',
            },
        });

        if (!subFolder) {
            await prisma.file.create({
                data: {
                    id: ulid(),
                    createdBy: adminUser!.id,
                    name: folder,
                    parentId: rootFolder?.id!,
                    type: 'FOLDER',
                    isDeletable: false,
                },
            });

            console.log(`Created ${folder} folder`);
        } else console.log(`${folder} already exists`);
    }
};

seedRootFolder();
