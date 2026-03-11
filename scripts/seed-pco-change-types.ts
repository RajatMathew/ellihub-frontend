import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const changeTypes = [
    { name: 'Scope Addition', code: 'SCOPE_ADDITION', color: 'blue', order: 1 },
    { name: 'Scope Reduction', code: 'SCOPE_REDUCTION', color: 'orange', order: 2 },
    { name: 'Design Change', code: 'DESIGN_CHANGE', color: 'purple', order: 3 },
    { name: 'Unforeseen Conditions', code: 'UNFORESEEN_CONDITIONS', color: 'red', order: 4 },
    { name: 'Owner Request', code: 'OWNER_REQUEST', color: 'teal', order: 5 },
    { name: 'RFI Resolution', code: 'RFI_RESOLUTION', color: 'cyan', order: 6 },
    { name: 'Code Compliance', code: 'CODE_COMPLIANCE', color: 'yellow', order: 7 },
    { name: 'Value Engineering', code: 'VALUE_ENGINEERING', color: 'green', order: 8 },
    { name: 'Other', code: 'OTHER', color: 'gray', order: 9 },
];

async function seed() {
    console.log('Seeding PCO change types...\n');

    for (const type of changeTypes) {
        const existing = await prisma.pCOChangeType.findFirst({
            where: { code: type.code },
        });

        if (existing) {
            console.log(`  Already exists: ${type.name} (${existing.id})`);
            continue;
        }

        const created = await prisma.pCOChangeType.create({
            data: {
                id: ulid(),
                ...type,
            },
        });

        console.log(`  Created: ${created.name} [${created.code}] (${created.id})`);
    }

    console.log('\nPCO change type seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
