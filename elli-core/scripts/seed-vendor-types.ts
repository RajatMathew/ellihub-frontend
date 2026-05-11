import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { ulid } from 'ulid';

const vendorTypes = ['MATERIAL', 'FABRICATION', 'INSTALLATION'];

export const seedVendorTypes = async () => {
    console.log('Seeding vendor types...');

    for (const label of vendorTypes) {
        const existing = await prisma.lookup.findUnique({
            where: { type_label: { type: LookupType.VENDOR_TYPE, label } },
        });

        if (existing) {
            console.log(`Already exists: ${label} (${existing.id})`);
        } else {
            const result = await prisma.lookup.create({
                data: {
                    id: ulid(),
                    type: LookupType.VENDOR_TYPE,
                    label,
                },
            });
            console.log(`Created: ${result.label} (${result.id})`);
        }
    }

    console.log('\nSeed complete!');
};

if (process.argv[1]?.endsWith('seed-vendor-types.ts')) {
    seedVendorTypes().catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    });
}
