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

const DUMMY_VENDOR_ID = '01JMSEEDVENDOR00000001';
const DUMMY_GC_ID = '01JMSEEDGCONT000000001';
let DUMMY_GC_TYPE_ID = '';

async function ensureDummyGCType() {
    const existing = await prisma.gCType.findFirst({ where: { code: 'PRIVATE' } });
    if (existing) {
        DUMMY_GC_TYPE_ID = existing.id;
        return;
    }
    const created = await prisma.gCType.create({
        data: {
            id: '01JMSEEDGCTYPE00000001',
            name: 'Private',
            code: 'PRIVATE',
        },
    });
    DUMMY_GC_TYPE_ID = created.id;
    console.log('  Created dummy GC type: Private');
}

async function ensureDummyVendor() {
    const existing = await prisma.vendor.findUnique({ where: { id: DUMMY_VENDOR_ID } });
    if (!existing) {
        await prisma.vendor.create({
            data: {
                id: DUMMY_VENDOR_ID,
                name: 'Acme Materials Co.',
                type: 'MATERIAL',
                taxId: '12-3456789',
                status: 'ACTIVE',
                email: 'info@acme-materials.com',
                phone: '+1-555-0001',
                address: '100 Industrial Blvd, Houston TX 77001',
            },
        });
        console.log('  Created dummy vendor: Acme Materials Co.');
    }
}

async function ensureDummyGC() {
    await ensureDummyGCType();
    const existing = await prisma.generalContractor.findUnique({ where: { id: DUMMY_GC_ID } });
    if (!existing) {
        await prisma.generalContractor.create({
            data: {
                id: DUMMY_GC_ID,
                name: 'BuildCorp General Contractors',
                gcTypeId: DUMMY_GC_TYPE_ID,
                status: 'ACTIVE',
                email: 'info@buildcorp.com',
                phone: '+1-555-0002',
                address: '200 Commerce St, Dallas TX 75201',
            },
        });
        console.log('  Created dummy GC: BuildCorp General Contractors');
    }
}

async function seed() {
    console.log('Seeding sample contacts...\n');

    // Ensure dummy vendor and GC exist for FK constraints
    await ensureDummyVendor();
    await ensureDummyGC();

    // Look up all roles
    const pmRole = await lookupRole('Project Manager');
    const estimatorRole = await lookupRole('Estimator');
    const superintendentRole = await lookupRole('Site Superintendent');
    const accountantRole = await lookupRole('Accountant');
    const engineerRole = await lookupRole('Engineer');
    const architectRole = await lookupRole('Architect');
    const foremanRole = await lookupRole('Foreman');
    const safetyRole = await lookupRole('Safety Officer');
    const executiveRole = await lookupRole('Executive');

    const contacts = [
        // Vendor-linked contacts
        {
            fullName: 'John Smith',
            professionalRoleId: pmRole?.id ?? null,
            email: { email: 'john.smith@acme.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0101', label: 'Office' },
            tags: ['primary-contact'],
            vendorLink: { vendorId: DUMMY_VENDOR_ID, isPrimary: true } as const,
            gcLink: null,
        },
        {
            fullName: 'Patricia Williams',
            professionalRoleId: executiveRole?.id ?? null,
            email: { email: 'p.williams@acme.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0110', label: 'Direct' },
            tags: ['executive', 'decision-maker'],
            vendorLink: { vendorId: DUMMY_VENDOR_ID, isPrimary: false } as const,
            gcLink: null,
        },
        {
            fullName: 'Kevin Nguyen',
            professionalRoleId: estimatorRole?.id ?? null,
            email: { email: 'kevin.nguyen@steelsupply.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0120', label: 'Mobile' },
            tags: ['estimating', 'steel'],
            vendorLink: { vendorId: DUMMY_VENDOR_ID, isPrimary: false } as const,
            gcLink: null,
        },
        // GC-linked contacts
        {
            fullName: 'Maria Garcia',
            professionalRoleId: estimatorRole?.id ?? null,
            email: { email: 'maria.garcia@buildcorp.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0202', label: 'Mobile' },
            tags: ['estimating'],
            vendorLink: null,
            gcLink: { generalContractorId: DUMMY_GC_ID, isPrimary: true } as const,
        },
        {
            fullName: 'James Rodriguez',
            professionalRoleId: pmRole?.id ?? null,
            email: { email: 'j.rodriguez@buildcorp.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0210', label: 'Office' },
            tags: ['project-lead'],
            vendorLink: null,
            gcLink: { generalContractorId: DUMMY_GC_ID, isPrimary: false } as const,
        },
        {
            fullName: 'Amanda Foster',
            professionalRoleId: safetyRole?.id ?? null,
            email: { email: 'a.foster@buildcorp.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0220', label: 'Field' },
            tags: ['safety', 'compliance'],
            vendorLink: null,
            gcLink: { generalContractorId: DUMMY_GC_ID, isPrimary: false } as const,
        },
        // Unlinked contacts (various roles)
        {
            fullName: 'Robert Chen',
            professionalRoleId: superintendentRole?.id ?? null,
            email: { email: 'robert.chen@fieldops.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0303', label: 'Field' },
            tags: ['field-ops', 'supervision'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Sarah Johnson',
            professionalRoleId: accountantRole?.id ?? null,
            email: { email: 'sarah.johnson@acme.com', label: 'Work' },
            phoneNumber: null,
            tags: ['accounting', 'invoicing'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Mike Davis',
            professionalRoleId: engineerRole?.id ?? null,
            email: null,
            phoneNumber: { phone: '+1-555-0505', label: 'Office' },
            tags: ['structural'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Linda Park',
            professionalRoleId: architectRole?.id ?? null,
            email: { email: 'linda.park@designstudio.com', label: 'Personal' },
            phoneNumber: { phone: '+1-555-0606', label: 'Mobile' },
            tags: ['design', 'planning'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Carlos Mendoza',
            professionalRoleId: foremanRole?.id ?? null,
            email: { email: 'c.mendoza@fieldcrew.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0707', label: 'Field' },
            tags: ['concrete', 'field-ops'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Emily Watson',
            professionalRoleId: safetyRole?.id ?? null,
            email: { email: 'e.watson@safetyfirst.org', label: 'Work' },
            phoneNumber: { phone: '+1-555-0808', label: 'Office' },
            tags: ['safety', 'training', 'osha'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'David Kim',
            professionalRoleId: executiveRole?.id ?? null,
            email: { email: 'david.kim@precisionbuild.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-0909', label: 'Direct' },
            tags: ['executive', 'decision-maker'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Rachel Thompson',
            professionalRoleId: engineerRole?.id ?? null,
            email: { email: 'r.thompson@mepengineering.com', label: 'Work' },
            phoneNumber: null,
            tags: ['mechanical', 'hvac'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Omar Hassan',
            professionalRoleId: foremanRole?.id ?? null,
            email: null,
            phoneNumber: { phone: '+1-555-1010', label: 'Mobile' },
            tags: ['electrical', 'field-ops'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Jennifer Lee',
            professionalRoleId: accountantRole?.id ?? null,
            email: { email: 'j.lee@financegroup.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-1111', label: 'Office' },
            tags: ['payroll', 'accounting'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Thomas Wright',
            professionalRoleId: superintendentRole?.id ?? null,
            email: { email: 't.wright@siteworks.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-1212', label: 'Field' },
            tags: ['supervision', 'scheduling'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Natalie Brooks',
            professionalRoleId: architectRole?.id ?? null,
            email: { email: 'n.brooks@urbandesign.com', label: 'Personal' },
            phoneNumber: { phone: '+1-555-1313', label: 'Mobile' },
            tags: ['interior-design', 'planning'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Brian Patel',
            professionalRoleId: pmRole?.id ?? null,
            email: { email: 'b.patel@projectpro.com', label: 'Work' },
            phoneNumber: { phone: '+1-555-1414', label: 'Office' },
            tags: ['coordination', 'scheduling'],
            vendorLink: null,
            gcLink: null,
        },
        {
            fullName: 'Sophia Martinez',
            professionalRoleId: estimatorRole?.id ?? null,
            email: { email: 's.martinez@costworks.com', label: 'Work' },
            phoneNumber: null,
            tags: ['estimating', 'takeoffs'],
            vendorLink: null,
            gcLink: null,
        },
    ];

    for (const contact of contacts) {
        const existing = await prisma.contact.findFirst({
            where: { fullName: contact.fullName, deletedAt: null },
        });

        if (existing) {
            console.log(`  Already exists: ${contact.fullName} (${existing.id})`);
            continue;
        }

        const contactId = ulid();

        await prisma.contact.create({
            data: {
                id: contactId,
                fullName: contact.fullName,
                professionalRoleId: contact.professionalRoleId,
                email: contact.email ?? undefined,
                phoneNumber: contact.phoneNumber ?? undefined,
                tags: contact.tags,
            },
        });

        if (contact.vendorLink) {
            await prisma.contactVendor.create({
                data: {
                    id: ulid(),
                    contactId,
                    vendorId: contact.vendorLink.vendorId,
                    isPrimary: contact.vendorLink.isPrimary,
                },
            });
            console.log(`  Created: ${contact.fullName} (${contactId}) + vendor link`);
        } else if (contact.gcLink) {
            await prisma.contactGC.create({
                data: {
                    id: ulid(),
                    contactId,
                    generalContractorId: contact.gcLink.generalContractorId,
                    isPrimary: contact.gcLink.isPrimary,
                },
            });
            console.log(`  Created: ${contact.fullName} (${contactId}) + GC link`);
        } else {
            console.log(`  Created: ${contact.fullName} (${contactId})`);
        }
    }

    console.log('\nContact seed complete!');
}

seed()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
