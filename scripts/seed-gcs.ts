import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seed() {
    console.log('Seeding general contractors...\n');

    // Get GC types
    const gcTypes = await prisma.gCType.findMany();
    if (gcTypes.length === 0) {
        console.error('No GC types found. Run seed-gc-types.ts first.');
        process.exit(1);
    }

    const typeMap = Object.fromEntries(gcTypes.map((t) => [t.code, t.id]));
    console.log(`  Found ${gcTypes.length} GC types: ${gcTypes.map((t) => t.code).join(', ')}`);

    // Get contacts for linking
    const contacts = await prisma.contact.findMany({
        where: { deletedAt: null },
        take: 20,
        select: { id: true, fullName: true },
    });
    console.log(`  Found ${contacts.length} contacts for linking\n`);

    const gcs = [
        {
            name: 'Turner Construction',
            gcTypeCode: 'PRIVATE',
            status: 'ACTIVE' as const,
            email: 'info@turnerconstruction.com',
            phone: '+1-212-555-0100',
            address: '375 Hudson St, New York, NY 10014',
            website: 'https://turnerconstruction.com',
            paymentTerms: 'NET_30' as const,
            retainagePercent: 10.0,
        },
        {
            name: 'Skanska USA',
            gcTypeCode: 'PRIVATE',
            status: 'ACTIVE' as const,
            email: 'contact@skanska.com',
            phone: '+1-917-555-0200',
            address: '1 Penn Plaza, New York, NY 10119',
            website: 'https://skanska.com',
            paymentTerms: 'NET_45' as const,
            retainagePercent: 10.0,
        },
        {
            name: 'NYC SCA District 1',
            gcTypeCode: 'SCA',
            status: 'ACTIVE' as const,
            email: 'district1@nycsca.org',
            phone: '+1-718-555-0300',
            address: '30-30 Thomson Ave, Long Island City, NY 11101',
            paymentTerms: 'NET_60' as const,
            retainagePercent: 5.0,
        },
        {
            name: 'Hensel Phelps',
            gcTypeCode: 'INSTITUTIONAL',
            status: 'ACTIVE' as const,
            email: 'info@henselphelps.com',
            phone: '+1-970-555-0400',
            address: '420 6th Ave, Greeley, CO 80631',
            website: 'https://henselphelps.com',
            paymentTerms: 'NET_30' as const,
            retainagePercent: 10.0,
        },
        {
            name: 'Granite Construction',
            gcTypeCode: 'CIVIL',
            status: 'ACTIVE' as const,
            email: 'info@graniteconstruction.com',
            phone: '+1-831-555-0500',
            address: '585 W Beach St, Watsonville, CA 95076',
            website: 'https://graniteconstruction.com',
            paymentTerms: 'NET_30' as const,
            retainagePercent: 10.0,
        },
        {
            name: 'State DOT Projects',
            gcTypeCode: 'PUBLIC_STATE',
            status: 'ACTIVE' as const,
            email: 'contracts@statedot.gov',
            phone: '+1-555-0600',
            address: '50 Wolf Rd, Albany, NY 12232',
            paymentTerms: 'NET_90' as const,
            retainagePercent: 5.0,
        },
        {
            name: 'Lendlease Americas',
            gcTypeCode: 'PRIVATE',
            status: 'PROSPECTING' as const,
            email: 'info@lendlease.com',
            phone: '+1-212-555-0700',
            address: '200 Park Ave, New York, NY 10166',
            website: 'https://lendlease.com',
            paymentTerms: 'NET_30' as const,
            retainagePercent: 10.0,
        },
        {
            name: 'Clark Construction',
            gcTypeCode: 'INSTITUTIONAL',
            status: 'ACTIVE' as const,
            email: 'info@clarkconstruction.com',
            phone: '+1-301-555-0800',
            address: '7500 Old Georgetown Rd, Bethesda, MD 20814',
            website: 'https://clarkconstruction.com',
            paymentTerms: 'NET_45' as const,
            retainagePercent: 10.0,
        },
    ];

    let contactIdx = 0;

    for (const gc of gcs) {
        const existing = await prisma.generalContractor.findFirst({
            where: { name: gc.name, deletedAt: null },
        });

        if (existing) {
            console.log(`  Already exists: ${gc.name} (${existing.id})`);
            continue;
        }

        const { gcTypeCode, ...gcData } = gc;
        const gcTypeId = typeMap[gcTypeCode];
        if (!gcTypeId) {
            console.warn(`  Skipping ${gc.name}: GC type "${gcTypeCode}" not found`);
            continue;
        }

        const gcId = ulid();

        await prisma.$transaction(async (tx) => {
            await tx.generalContractor.create({
                data: {
                    id: gcId,
                    ...gcData,
                    gcTypeId,
                },
            });

            // Link 2 contacts to each GC (if available)
            const linksToCreate = [];
            for (let i = 0; i < 2 && contactIdx < contacts.length; i++, contactIdx++) {
                linksToCreate.push({
                    id: ulid(),
                    contactId: contacts[contactIdx].id,
                    generalContractorId: gcId,
                    isPrimary: i === 0,
                });
            }

            if (linksToCreate.length > 0) {
                await tx.contactGC.createMany({ data: linksToCreate });
            }

            const contactNames = linksToCreate.map(
                (l) => contacts.find((c) => c.id === l.contactId)?.fullName
            );
            console.log(
                `  Created: ${gc.name} [${gcTypeCode}] (${gcId})` +
                    (contactNames.length > 0 ? ` + contacts: ${contactNames.join(', ')}` : '')
            );
        });
    }

    console.log('\nGC seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
