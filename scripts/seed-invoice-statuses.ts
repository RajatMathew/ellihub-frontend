import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const statuses = [
    { name: 'PENDING', label: 'Pending Approval', color: 'yellow', order: 1, isDefault: true },
    { name: 'APPROVED', label: 'Approved for Payment', color: 'green', order: 2 },
    { name: 'REJECTED', label: 'Rejected', color: 'red', order: 3 },
];

async function seed() {
    console.log('Seeding Invoice statuses...\n');

    for (const status of statuses) {
        const existing = await prisma.invoiceStatus.findFirst({
            where: { name: status.name },
        });

        if (existing) {
            console.log(`  Already exists: ${status.label} (${existing.id})`);
            continue;
        }

        const created = await prisma.invoiceStatus.create({
            data: {
                id: ulid(),
                ...status,
            },
        });

        console.log(`  Created: ${created.label} [${created.name}] (${created.id})`);
    }

    console.log('\nInvoice status seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
