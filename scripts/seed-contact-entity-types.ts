import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const entityTypes = ['Vendor', 'General Contractor', 'Architect', 'Cleaner'];

async function seed() {
    console.log('Seeding contact entity types...');

    for (const name of entityTypes) {
        const existing = await prisma.contactEntityType.findFirst({
            where: { name },
        });

        if (existing) {
            console.log(`  Already exists: ${name} (${existing.id})`);
        } else {
            const result = await prisma.contactEntityType.create({
                data: {
                    id: ulid(),
                    name,
                },
            });
            console.log(`  Created: ${result.name} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
