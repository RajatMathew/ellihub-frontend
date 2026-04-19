import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { ulid } from 'ulid';

const tradeCategories = ['MATERIAL', 'FABRICATION', 'INSTALLATION', 'LABOR', 'EQUIPMENT'];

export const seedTradeCategories = async () => {
    console.log('Seeding trade categories...');

    for (const label of tradeCategories) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.TRADE_CATEGORY, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: ulid(),
                    type: LookupType.TRADE_CATEGORY,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-trade-categories.ts')) {
    seedTradeCategories().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
