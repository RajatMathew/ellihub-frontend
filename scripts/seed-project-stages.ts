import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const stages = [
    { name: 'Installation', code: 'INSTALLATION', color: 'blue' },
    { name: 'Fabrication', code: 'FABRICATION', color: 'purple' },
    { name: 'Submittals', code: 'SUBMITTALS', color: 'yellow' },
    { name: 'Buyout', code: 'BUYOUT', color: 'orange' },
    { name: 'Closeout', code: 'CLOSEOUT', color: 'green' },
    { name: 'Punchlist', code: 'PUNCHLIST', color: 'red' },
];

async function seed() {
    console.log('Seeding project stages...\n');

    for (const stage of stages) {
        const existing = await prisma.projectStage.findFirst({
            where: { code: stage.code },
        });

        if (existing) {
            console.log(`  Already exists: ${stage.name} (${existing.id})`);
            continue;
        }

        const created = await prisma.projectStage.create({
            data: {
                id: ulid(),
                ...stage,
            },
        });

        console.log(`  Created: ${created.name} [${created.code}] (${created.id})`);
    }

    console.log('\nProject stage seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
