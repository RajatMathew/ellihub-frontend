import { prisma } from '@lib/prisma';
import { ulid } from 'ulid';

export const seedRootFolder = async () => {
    const rootFolder = await prisma.file.findFirst({
        where: {
            name: 'root',
        },
    });

    const adminUser = await prisma.user.findUnique({
        where: {
            email: 'admin@elli.com',
        },
    });

    if (!rootFolder) {
        await prisma.file.create({
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
};
