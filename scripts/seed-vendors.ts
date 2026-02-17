import { PrismaClient } from '@db/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { ulid } from 'ulid';

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function lookupRole(name: string) {
    const role = await prisma.professionalRole.findFirst({
        where: { name, deletedAt: null },
    });
    if (!role) {
        console.warn(`  Warning: Professional role "${name}" not found. Run seed-professional-roles first.`);
    }
    return role;
}

const vendors = [
    {
        name: 'Premium Wood & Co.',
        type: 'MATERIAL' as const,
        categoryTags: ['Wood', 'Lumber'],
        status: 'ACTIVE' as const,
        paymentTerms: 'NET_30' as const,
        contact: {
            fullName: 'Sarah Johnson',
            roleName: 'Estimator',
            email: { email: 'sarah@premiumwood.com', label: 'Work' },
        },
    },
    {
        name: 'Brooklyn Carpentry LLC',
        type: 'INSTALLATION' as const,
        categoryTags: ['Carpentry', 'Millwork'],
        status: 'ACTIVE' as const,
        paymentTerms: 'NET_30' as const,
        contact: {
            fullName: 'Mike Chen',
            roleName: 'Project Manager',
            email: { email: 'mike@brooklyncarp.com', label: 'Work' },
        },
    },
    {
        name: 'Aluminum Curtain Wall Fabricators Inc.',
        type: 'FABRICATION' as const,
        categoryTags: ['Aluminum', 'Glass'],
        status: 'ACTIVE' as const,
        paymentTerms: 'NET_45' as const,
        contact: {
            fullName: 'Lisa Martinez',
            roleName: 'Engineer',
            email: { email: 'lisa@acwf.com', label: 'Work' },
        },
    },
    {
        name: 'Elite Steel Works',
        type: 'FABRICATION' as const,
        categoryTags: ['Steel', 'Metal'],
        status: 'ACTIVE' as const,
        paymentTerms: 'NET_60' as const,
        contact: {
            fullName: 'Robert Davis',
            roleName: 'Executive',
            email: { email: 'robert@elitesteel.com', label: 'Work' },
        },
    },
    {
        name: 'Acme Millwork',
        type: 'INSTALLATION' as const,
        categoryTags: ['Millwork', 'Custom'],
        status: 'PROSPECT' as const,
        paymentTerms: 'NET_30' as const,
        contact: {
            fullName: 'Jennifer Lee',
            roleName: 'Executive',
            email: { email: 'jen@acmemillwork.com', label: 'Work' },
        },
    },
];

async function seed() {
    console.log('Seeding vendors...\n');

    for (const v of vendors) {
        // Check if vendor already exists
        const existing = await prisma.vendor.findFirst({
            where: { name: v.name, deletedAt: null },
        });

        if (existing) {
            console.log(`  Already exists: ${v.name} (${existing.id})`);
            continue;
        }

        const vendorId = ulid();

        // Create vendor
        await prisma.vendor.create({
            data: {
                id: vendorId,
                name: v.name,
                type: v.type,
                categoryTags: v.categoryTags,
                status: v.status,
                paymentTerms: v.paymentTerms,
            },
        });

        // Find or create contact
        let contact = await prisma.contact.findFirst({
            where: { fullName: v.contact.fullName, deletedAt: null },
        });

        if (!contact) {
            const role = await lookupRole(v.contact.roleName);
            const contactId = ulid();
            contact = await prisma.contact.create({
                data: {
                    id: contactId,
                    fullName: v.contact.fullName,
                    professionalRoleId: role?.id ?? null,
                    email: v.contact.email,
                    tags: [],
                },
            });
            console.log(`  Created contact: ${contact.fullName} (${contact.id})`);
        }

        // Link contact to vendor
        await prisma.contactVendor.create({
            data: {
                id: ulid(),
                contactId: contact.id,
                vendorId,
                isPrimary: true,
            },
        });

        console.log(`  Created vendor: ${v.name} (${vendorId}) + contact link`);
    }

    console.log('\nVendor seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
