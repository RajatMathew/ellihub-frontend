import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { ulid } from 'ulid';

const changeTypes = [
    'Unforeseen Conditions',
    'Design Change',
    'Quantity Adjustment',
    'Material Substitution',
    'Labor Adjustment',
    'Equipment Rental',
    'Credit',
    'Backcharge',
    'Schedule Acceleration',
    'Other',
];

export const seedScoChangeTypes = async () => {
    console.log('Seeding SCO change types...');

    for (const label of changeTypes) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.SCO_CHANGE_TYPE, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: ulid(),
                    type: LookupType.SCO_CHANGE_TYPE,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-sco-change-types.ts')) {
    seedScoChangeTypes().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
