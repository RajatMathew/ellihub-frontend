import fs from 'node:fs/promises';
import path from 'node:path';

import { GCStatus, PaymentTerms } from '@db/enums';
import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

type GcSeedRow = {
    name: string;
    gcTypeId: string | null;
    status: GCStatus;
    address: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    fax: string | null;
    paymentTerms: PaymentTerms;
    retainagePercent: number;
};

type GcContactSeedRow = {
    generalContractorName: string;
    fullName: string;
    professionalRoleId: string | null;
    email: string | null;
    phoneNumber: string | null;
    tags: string[];
    isPrimary: boolean;
};

const gcSeedFilePath = path.resolve(process.cwd(), 'scripts/data/gc-list.seed.json');
const contactSeedFilePath = path.resolve(process.cwd(), 'scripts/data/gc-contact-list.seed.json');
const defaultGcTypeLabel = 'Private';

const nullableString = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim() || null;
};

const isGcStatus = (value: string): value is GCStatus =>
    Object.values(GCStatus).includes(value as GCStatus);

const isPaymentTerms = (value: string): value is PaymentTerms =>
    Object.values(PaymentTerms).includes(value as PaymentTerms);

const readJsonArray = async (filePath: string): Promise<unknown[]> => {
    const contents = await fs.readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(contents);

    if (!Array.isArray(parsed)) {
        throw new Error(`${path.basename(filePath)} must contain an array`);
    }

    return parsed;
};

const readGcSeedRows = async (): Promise<GcSeedRow[]> => {
    const rows = await readJsonArray(gcSeedFilePath);

    return rows.map((row, index) => {
        if (!row || typeof row !== 'object') {
            throw new Error(`GC seed row ${index + 1} is not an object`);
        }

        const source = row as Record<string, unknown>;
        const name = nullableString(source.name);
        if (!name || name.length < 2) {
            throw new Error(`GC seed row ${index + 1} is missing a valid name`);
        }

        const status = String(source.status || GCStatus.ACTIVE);
        if (!isGcStatus(status)) {
            throw new Error(`GC seed row ${index + 1} has invalid status: ${status}`);
        }

        const paymentTerms = String(source.paymentTerms || PaymentTerms.NET_30);
        if (!isPaymentTerms(paymentTerms)) {
            throw new Error(`GC seed row ${index + 1} has invalid paymentTerms: ${paymentTerms}`);
        }

        const retainagePercent = Number(source.retainagePercent ?? 10);
        if (!Number.isFinite(retainagePercent) || retainagePercent < 0 || retainagePercent > 100) {
            throw new Error(`GC seed row ${index + 1} has invalid retainagePercent`);
        }

        return {
            name,
            gcTypeId: nullableString(source.gcTypeId),
            status,
            address: nullableString(source.address),
            email: nullableString(source.email),
            phone: nullableString(source.phone),
            website: nullableString(source.website),
            fax: nullableString(source.fax),
            paymentTerms,
            retainagePercent,
        };
    });
};

const readContactSeedRows = async (): Promise<GcContactSeedRow[]> => {
    const rows = await readJsonArray(contactSeedFilePath);

    return rows.map((row, index) => {
        if (!row || typeof row !== 'object') {
            throw new Error(`GC contact seed row ${index + 1} is not an object`);
        }

        const source = row as Record<string, unknown>;
        const generalContractorName = nullableString(source.generalContractorName);
        const fullName = nullableString(source.fullName);
        if (!generalContractorName || !fullName) {
            throw new Error(`GC contact seed row ${index + 1} is missing GC name or contact name`);
        }

        return {
            generalContractorName,
            fullName,
            professionalRoleId: nullableString(source.professionalRoleId),
            email: nullableString(source.email),
            phoneNumber: nullableString(source.phoneNumber),
            tags: Array.isArray(source.tags) ? source.tags.map(String).filter(Boolean) : [],
            isPrimary: Boolean(source.isPrimary),
        };
    });
};

const ensureDefaultGcType = async (): Promise<string> => {
    const existing = await prisma.lookup.findUnique({
        where: { type_label: { type: LookupType.GC_TYPE, label: defaultGcTypeLabel } },
    });
    if (existing) return existing.id;

    const created = await prisma.lookup.create({
        data: {
            id: generateNanoId(),
            type: LookupType.GC_TYPE,
            label: defaultGcTypeLabel,
        },
    });
    return created.id;
};

export const seedGeneralContractors = async () => {
    console.log('Seeding GCs from cleaned GC list...');

    const [gcSeedRows, defaultGcTypeId] = await Promise.all([
        readGcSeedRows(),
        ensureDefaultGcType(),
    ]);

    const existingGcs = await prisma.generalContractor.findMany({
        select: { id: true, name: true },
    });
    const gcIdsByName = new Map(existingGcs.map((gc) => [gc.name.toLowerCase(), gc.id]));

    let createdGcCount = 0;
    let skippedGcCount = 0;

    for (const row of gcSeedRows) {
        const key = row.name.toLowerCase();
        if (gcIdsByName.has(key)) {
            skippedGcCount += 1;
            continue;
        }

        const created = await prisma.generalContractor.create({
            data: {
                id: generateNanoId(),
                name: row.name,
                gcTypeId: row.gcTypeId ?? defaultGcTypeId,
                status: row.status,
                address: row.address,
                email: row.email,
                phone: row.phone,
                website: row.website,
                fax: row.fax,
                paymentTerms: row.paymentTerms,
                retainagePercent: row.retainagePercent,
            },
        });

        gcIdsByName.set(key, created.id);
        createdGcCount += 1;
    }

    console.log(`Created GCs: ${createdGcCount}`);
    console.log(`Skipped existing GCs: ${skippedGcCount}`);
    console.log('GC seed complete!');
};

export const seedGcContacts = async () => {
    console.log('Seeding GC contacts from cleaned contact list...');

    const contactSeedRows = await readContactSeedRows();
    const existingGcs = await prisma.generalContractor.findMany({
        select: { id: true, name: true },
    });
    const gcIdsByName = new Map(existingGcs.map((gc) => [gc.name.toLowerCase(), gc.id]));

    const existingContacts = await prisma.contact.findMany({
        where: { generalContractorId: { not: null } },
        select: { fullName: true, generalContractorId: true },
    });
    const existingContactKeys = new Set(
        existingContacts.map(
            (contact) => `${contact.generalContractorId}:${contact.fullName.toLowerCase()}`
        )
    );

    let createdContactCount = 0;
    let skippedContactCount = 0;

    for (const row of contactSeedRows) {
        const generalContractorId = gcIdsByName.get(row.generalContractorName.toLowerCase());
        if (!generalContractorId) {
            skippedContactCount += 1;
            continue;
        }

        const contactKey = `${generalContractorId}:${row.fullName.toLowerCase()}`;
        if (existingContactKeys.has(contactKey)) {
            skippedContactCount += 1;
            continue;
        }

        await prisma.contact.create({
            data: {
                id: generateNanoId(),
                fullName: row.fullName,
                professionalRoleId: row.professionalRoleId,
                email: row.email,
                phoneNumber: row.phoneNumber,
                tags: row.tags,
                isPrimary: row.isPrimary,
                generalContractorId,
                vendorId: null,
            },
        });

        existingContactKeys.add(contactKey);
        createdContactCount += 1;
    }

    console.log(`Created GC contacts: ${createdContactCount}`);
    console.log(`Skipped existing GC contacts: ${skippedContactCount}`);
    console.log('GC contact seed complete!');
};

export const seedGcs = async () => {
    await seedGeneralContractors();
    await seedGcContacts();
};

if (process.argv[1]?.endsWith('seed-gcs.ts')) {
    seedGcs()
        .catch((e) => {
            console.error('GC seed failed:', e);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
