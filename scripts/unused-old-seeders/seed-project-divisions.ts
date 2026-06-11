import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

const projectDivisions = ['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL'];

export const seedProjectDivisions = async () => {
    console.log('Seeding project divisions...');

    for (const label of projectDivisions) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.PROJECT_DIVISION, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: generateNanoId(),
                    type: LookupType.PROJECT_DIVISION,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-project-divisions.ts')) {
    seedProjectDivisions().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
