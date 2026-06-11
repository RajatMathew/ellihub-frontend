import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

const ptoTypes = ['Vacation', 'Sick', 'Maternity / Paternity', 'Personal', 'Bereavement'];

export const seedPtoTypes = async () => {
    console.log('Seeding PTO types...');

    for (const label of ptoTypes) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.PTO_TYPE, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: generateNanoId(),
                    type: LookupType.PTO_TYPE,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-pto-types.ts')) {
    seedPtoTypes().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
