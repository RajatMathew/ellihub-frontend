import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const statuses = [
    { name: 'DRAFT', label: 'Draft', color: 'gray', order: 1, isDefault: true },
    { name: 'ISSUED', label: 'Issued', color: 'blue', order: 2 },
    { name: 'PARTIALLY_PAID', label: 'Partially Paid', color: 'yellow', order: 3 },
    { name: 'PAID', label: 'Paid', color: 'green', order: 4 },
    { name: 'CANCELLED', label: 'Cancelled', color: 'red', order: 5 },
];

async function seed() {
    console.log('Seeding PO statuses...\n');

    for (const status of statuses) {
        const existing = await prisma.pOStatus.findFirst({
            where: { name: status.name },
        });

        if (existing) {
            console.log(`  Already exists: ${status.label} (${existing.id})`);
            continue;
        }

        const created = await prisma.pOStatus.create({
            data: {
                id: ulid(),
                ...status,
            },
        });

        console.log(`  Created: ${created.label} [${created.name}] (${created.id})`);
    }

    console.log('\nPO status seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
