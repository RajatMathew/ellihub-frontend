import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const employees = [
    { name: 'Mike Johnson', email: 'mike.johnson@elli.com', phoneNumber: '2125551000' },
    { name: 'Sarah Davis', email: 'sarah.davis@elli.com', phoneNumber: '2125552000' },
    { name: 'James Wilson', email: 'james.wilson@elli.com', phoneNumber: '2125553000' },
];

async function seed() {
    console.log('Seeding employees...\n');

    for (const emp of employees) {
        const existing = await prisma.employee.findFirst({
            where: { name: emp.name },
        });

        if (existing) {
            console.log(`  Already exists: ${emp.name} (${existing.id})`);
            continue;
        }

        const created = await prisma.employee.create({
            data: {
                id: ulid(),
                ...emp,
            },
        });

        console.log(`  Created: ${created.name} (${created.id})`);
    }

    console.log('\nEmployee seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
