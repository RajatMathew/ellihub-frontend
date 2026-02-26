import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const changeTypes = [
    { name: 'UNFORESEEN_CONDITIONS', code: 'UFC', description: 'Unforeseen site or field conditions', color: 'orange', order: 1 },
    { name: 'DESIGN_CHANGE', code: 'DSC', description: 'Changes to design or specifications', color: 'blue', order: 2 },
    { name: 'QUANTITY_ADJUSTMENT', code: 'QTY', description: 'Adjustment to quantities', color: 'purple', order: 3 },
    { name: 'MATERIAL_SUBSTITUTION', code: 'MAT', description: 'Substitution of materials', color: 'teal', order: 4 },
    { name: 'LABOR_ADJUSTMENT', code: 'LAB', description: 'Adjustment to labor scope or rates', color: 'yellow', order: 5 },
    { name: 'EQUIPMENT_RENTAL', code: 'EQP', description: 'Equipment rental changes', color: 'amber', order: 6 },
    { name: 'CREDIT', code: 'CRD', description: 'Credit or cost reduction', color: 'green', order: 7 },
    { name: 'BACKCHARGE', code: 'BCK', description: 'Backcharge to vendor', color: 'red', order: 8 },
    { name: 'SCHEDULE_ACCELERATION', code: 'ACC', description: 'Schedule acceleration costs', color: 'pink', order: 9 },
    { name: 'OTHER', code: 'OTH', description: 'Other change type', color: 'gray', order: 10 },
];

async function seed() {
    console.log('Seeding SCO change types...\n');

    for (const changeType of changeTypes) {
        const existing = await prisma.sCOChangeType.findFirst({
            where: { name: changeType.name },
        });

        if (existing) {
            console.log(`  Already exists: ${changeType.name} (${existing.id})`);
            continue;
        }

        const created = await prisma.sCOChangeType.create({
            data: {
                id: ulid(),
                ...changeType,
            },
        });

        console.log(`  Created: ${created.name} [${created.code}] (${created.id})`);
    }

    console.log('\nSCO change type seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
