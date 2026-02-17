import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const gcTypes = [
    { name: 'SCA', code: 'SCA', description: 'School Construction Authority' },
    { name: 'Civil', code: 'CIVIL', description: 'Civil / infrastructure projects' },
    { name: 'Institutional', code: 'INSTITUTIONAL', description: 'Government and institutional buildings' },
    { name: 'Public / State', code: 'PUBLIC_STATE', description: 'Public and state-funded projects' },
    { name: 'Private', code: 'PRIVATE', description: 'Private sector general contractors' },
];

async function seed() {
    console.log('Seeding GC types...\n');

    for (const gcType of gcTypes) {
        const existing = await prisma.gCType.findFirst({
            where: { code: gcType.code },
        });

        if (existing) {
            console.log(`  Already exists: ${gcType.name} (${existing.id})`);
            continue;
        }

        const created = await prisma.gCType.create({
            data: {
                id: ulid(),
                ...gcType,
            },
        });

        console.log(`  Created: ${created.name} [${created.code}] (${created.id})`);
    }

    console.log('\nGC type seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
