import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const changeTypes = [
    { name: 'DEADLINE_EXTENSION', code: 'DLE', description: 'Extension of bid deadline', color: 'blue', order: 1 },
    { name: 'SCOPE_CHANGE', code: 'SCC', description: 'Change to project scope', color: 'purple', order: 2 },
    { name: 'CLARIFICATION', code: 'CLR', description: 'Clarification of requirements', color: 'yellow', order: 3 },
    { name: 'SPECIFICATION_UPDATE', code: 'SPU', description: 'Update to specifications', color: 'teal', order: 4 },
    { name: 'DRAWING_REVISION', code: 'DRR', description: 'Revision to drawings', color: 'orange', order: 5 },
    { name: 'SITE_CONDITIONS', code: 'STC', description: 'Site condition changes', color: 'amber', order: 6 },
    { name: 'CANCELLATION', code: 'CAN', description: 'RFQ cancellation', color: 'red', order: 7 },
];

async function seed() {
    console.log('Seeding Addendum change types...\n');

    for (const changeType of changeTypes) {
        const existing = await prisma.addendumChangeType.findFirst({
            where: { name: changeType.name },
        });

        if (existing) {
            console.log(`  Already exists: ${changeType.name} (${existing.id})`);
            continue;
        }

        const created = await prisma.addendumChangeType.create({
            data: {
                id: ulid(),
                ...changeType,
            },
        });

        console.log(`  Created: ${created.name} [${created.code}] (${created.id})`);
    }

    console.log('\nAddendum change type seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
