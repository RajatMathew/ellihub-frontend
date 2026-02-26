import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const statuses = [
    { name: 'DRAFT', label: 'Draft', color: 'gray', order: 1 },
    { name: 'PENDING_REVIEW', label: 'Pending Review', color: 'yellow', order: 2 },
    { name: 'REVERTED', label: 'Reverted', color: 'orange', order: 3 },
    { name: 'APPROVED', label: 'Approved', color: 'blue', order: 4 },
    { name: 'SENT_TO_GC', label: 'Sent to GC', color: 'purple', order: 5 },
    { name: 'PENCILED', label: 'Penciled', color: 'amber', order: 6 },
    { name: 'EXECUTED', label: 'Executed', color: 'green', order: 7 },
    { name: 'REJECTED', label: 'Rejected', color: 'red', order: 8 },
    { name: 'VOID', label: 'Void', color: 'darkgray', order: 9 },
];

async function seed() {
    console.log('Seeding PCO statuses...\n');

    for (const status of statuses) {
        const existing = await prisma.changeOrderStatus.findFirst({
            where: { name: status.name },
        });

        if (existing) {
            console.log(`  Already exists: ${status.label} (${existing.id})`);
            continue;
        }

        const created = await prisma.changeOrderStatus.create({
            data: {
                id: ulid(),
                ...status,
            },
        });

        console.log(`  Created: ${created.label} [${created.name}] (${created.id})`);
    }

    console.log('\nPCO status seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
