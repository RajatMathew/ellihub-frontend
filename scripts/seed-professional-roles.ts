import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { ulid } from 'ulid';

const roles = [
    'Project Manager',
    'Site Superintendent',
    'Estimator',
    'Architect',
    'Engineer',
    'Foreman',
    'Safety Officer',
    'Accountant',
    'Executive',
];

export const seedProfessionalRoles = async () => {
    console.log('Seeding professional roles...');

    for (const label of roles) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.PROFESSIONAL_ROLE, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: ulid(),
                    type: LookupType.PROFESSIONAL_ROLE,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

seedProfessionalRoles().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
