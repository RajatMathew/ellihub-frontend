import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const statuses = [
    { name: 'BIDDING', label: 'Bidding', color: 'blue', order: 1, isDefault: true },
    { name: 'NEGOTIATION', label: 'Negotiation', color: 'purple', order: 2, isDefault: false },
    { name: 'AWARDED', label: 'Awarded', color: 'teal', order: 3, isDefault: false },
    { name: 'ACTIVE', label: 'Active', color: 'green', order: 4, isDefault: false },
    { name: 'ON_HOLD', label: 'On Hold', color: 'yellow', order: 5, isDefault: false },
    { name: 'COMPLETED', label: 'Completed', color: 'gray', order: 6, isDefault: false },
    { name: 'CANCELLED', label: 'Cancelled', color: 'red', order: 7, isDefault: false },
];

async function seed() {
    console.log('Seeding project statuses...\n');

    for (const status of statuses) {
        const existing = await prisma.projectStatus.findFirst({
            where: { name: status.name },
        });

        if (existing) {
            console.log(`  Already exists: ${status.label} (${existing.id})`);
            continue;
        }

        const created = await prisma.projectStatus.create({
            data: {
                id: ulid(),
                ...status,
            },
        });

        console.log(`  Created: ${created.label} [${created.name}] (${created.id})`);
    }

    console.log('\nProject status seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
