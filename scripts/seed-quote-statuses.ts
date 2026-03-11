import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const statuses = [
    { name: 'DRAFT', label: 'Draft', color: 'gray', order: 1, isDefault: true },
    { name: 'SUBMITTED', label: 'Submitted', color: 'blue', order: 2 },
    { name: 'UNDER_REVIEW', label: 'Under Review', color: 'yellow', order: 3 },
    { name: 'AWARDED', label: 'Awarded', color: 'green', order: 4 },
    { name: 'NOT_AWARDED', label: 'Not Awarded', color: 'red', order: 5 },
    { name: 'WITHDRAWN', label: 'Withdrawn', color: 'darkgray', order: 6 },
];

async function seed() {
    console.log('Seeding Quote statuses...\n');

    for (const status of statuses) {
        const existing = await prisma.quoteStatus.findFirst({
            where: { name: status.name },
        });

        if (existing) {
            console.log(`  Already exists: ${status.label} (${existing.id})`);
            continue;
        }

        const created = await prisma.quoteStatus.create({
            data: {
                id: ulid(),
                ...status,
            },
        });

        console.log(`  Created: ${created.label} [${created.name}] (${created.id})`);
    }

    console.log('\nQuote status seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
