import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { ulid } from 'ulid';

const gcTypes = ['SCA', 'Civil', 'Institutional', 'Public / State', 'Public', 'Private'];

export const seedGcTypes = async () => {
    console.log('Seeding GC types...');

    for (const label of gcTypes) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.GC_TYPE, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: ulid(),
                    type: LookupType.GC_TYPE,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-gc-types.ts')) {
    seedGcTypes().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
