import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const statuses = [
    { name: 'DRAFT', label: 'Draft', color: 'gray', order: 1, isDefault: true },
    { name: 'PUBLISHED', label: 'Published', color: 'blue', order: 2 },
    { name: 'EVALUATION', label: 'Evaluation', color: 'yellow', order: 3 },
    { name: 'AWARDED', label: 'Awarded', color: 'green', order: 4 },
    { name: 'CANCELLED', label: 'Cancelled', color: 'red', order: 5 },
    { name: 'VOID', label: 'Void', color: 'darkgray', order: 6 },
];

async function seed() {
    console.log('Seeding RFQ statuses...\n');

    for (const status of statuses) {
        const existing = await prisma.rFQStatus.findFirst({
            where: { name: status.name },
        });

        if (existing) {
            console.log(`  Already exists: ${status.label} (${existing.id})`);
            continue;
        }

        const created = await prisma.rFQStatus.create({
            data: {
                id: ulid(),
                ...status,
            },
        });

        console.log(`  Created: ${created.label} [${created.name}] (${created.id})`);
    }

    console.log('\nRFQ status seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
