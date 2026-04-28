import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { ulid } from 'ulid';

const units = [
    'EACH',
    'PIECE',
    'PAIR',
    'SET',
    'BOX',
    'PALLET',
    'ROLL',
    'BUNDLE',
    'MM',
    'CM',
    'M',
    'KM',
    'INCH',
    'FOOT',
    'YARD',
    'SQ_M',
    'SQ_FT',
    'SQ_YD',
    'CU_M',
    'CU_FT',
    'CU_YD',
    'LITRE',
    'GALLON',
    'ML',
    'MG',
    'GRAM',
    'KG',
    'TON',
    'METRIC_TON',
    'POUND',
    'OUNCE',
    'HOUR',
    'DAY',
    'WEEK',
    'MONTH',
    'LUMP_SUM',
];

export const seedUnits = async () => {
    console.log('Seeding units...');

    for (const label of units) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.UNIT, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: ulid(),
                    type: LookupType.UNIT,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-units.ts')) {
    seedUnits().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
