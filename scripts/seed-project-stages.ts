import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { ulid } from 'ulid';

const stages = ['INSTALLATION', 'FABRICATION', 'SUBMITTALS', 'BUYOUT', 'CLOSEOUT', 'PUNCHLIST'];

export const seedProjectStages = async () => {
    console.log('Seeding project stages...');

    for (const label of stages) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.PROJECT_STAGE, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: ulid(),
                    type: LookupType.PROJECT_STAGE,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-project-stages.ts')) {
    seedProjectStages().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
