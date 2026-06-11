import fs from 'node:fs/promises';
import path from 'node:path';

import { PaymentTerms, VendorStatus } from '@db/enums';
import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

type VendorSeedRow = {
    name: string;
    typeId: string | null;
    categoryTags: string[];
    taxId: string | null;
    status: VendorStatus;
    address: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    fax: string | null;
    paymentTerms: PaymentTerms;
    notes: string | null;
};

const seedFilePath = path.resolve(process.cwd(), 'scripts/data/vendor-list.seed.json');

const isVendorStatus = (value: string): value is VendorStatus =>
    Object.values(VendorStatus).includes(value as VendorStatus);

const isPaymentTerms = (value: string): value is PaymentTerms =>
    Object.values(PaymentTerms).includes(value as PaymentTerms);

const nullableString = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim() || null;
};

const readVendorSeedRows = async (): Promise<VendorSeedRow[]> => {
    const contents = await fs.readFile(seedFilePath, 'utf8');
    const parsed: unknown = JSON.parse(contents);

    if (!Array.isArray(parsed)) {
        throw new Error('Vendor seed file must contain an array');
    }

    return parsed.map((row, index) => {
        if (!row || typeof row !== 'object') {
            throw new Error(`Vendor seed row ${index + 1} is not an object`);
        }

        const source = row as Record<string, unknown>;
        const name = nullableString(source.name);
        if (!name || name.length < 2) {
            throw new Error(`Vendor seed row ${index + 1} is missing a valid name`);
        }

        const status = String(source.status || VendorStatus.ACTIVE);
        if (!isVendorStatus(status)) {
            throw new Error(`Vendor seed row ${index + 1} has invalid status: ${status}`);
        }

        const paymentTerms = String(source.paymentTerms || PaymentTerms.NET_30);
        if (!isPaymentTerms(paymentTerms)) {
            throw new Error(
                `Vendor seed row ${index + 1} has invalid paymentTerms: ${paymentTerms}`
            );
        }

        return {
            name,
            typeId: nullableString(source.typeId),
            categoryTags: Array.isArray(source.categoryTags)
                ? source.categoryTags.map(String).filter(Boolean)
                : [],
            taxId: nullableString(source.taxId),
            status,
            address: nullableString(source.address),
            email: nullableString(source.email),
            phone: nullableString(source.phone),
            website: nullableString(source.website),
            fax: nullableString(source.fax),
            paymentTerms,
            notes: nullableString(source.notes),
        };
    });
};

const ensureVendorType = async (label: string): Promise<string> => {
    const existing = await prisma.lookup.findUnique({
        where: { type_label: { type: LookupType.VENDOR_TYPE, label } },
    });
    if (existing) return existing.id;

    const created = await prisma.lookup.create({
        data: { id: generateNanoId(), type: LookupType.VENDOR_TYPE, label },
    });
    return created.id;
};

export const seedVendors = async () => {
    console.log('Seeding vendors from cleaned vendor list...');

    const seedRows = await readVendorSeedRows();
    const defaultVendorTypeId = await ensureVendorType('MATERIAL');
    const seedRowsByName = new Map<string, VendorSeedRow>();
    const duplicateNames: string[] = [];

    for (const row of seedRows) {
        const key = row.name.toLowerCase();
        if (seedRowsByName.has(key)) {
            duplicateNames.push(row.name);
            continue;
        }
        seedRowsByName.set(key, row);
    }

    const existing = await prisma.vendor.findMany({
        select: { id: true, name: true, typeId: true },
    });
    const existingByName = new Map(existing.map((vendor) => [vendor.name.toLowerCase(), vendor]));

    let createdCount = 0;
    let updatedTypeCount = 0;
    let skippedCount = 0;

    for (const row of seedRowsByName.values()) {
        const typeId = row.typeId ?? defaultVendorTypeId;
        const existingVendor = existingByName.get(row.name.toLowerCase());
        if (existingVendor) {
            if (!existingVendor.typeId) {
                await prisma.vendor.update({
                    where: { id: existingVendor.id },
                    data: { typeId },
                });
                existingVendor.typeId = typeId;
                updatedTypeCount += 1;
            }
            skippedCount += 1;
            continue;
        }

        await prisma.vendor.create({
            data: {
                id: generateNanoId(),
                name: row.name,
                typeId,
                categoryTags: row.categoryTags,
                taxId: row.taxId,
                status: row.status,
                address: row.address,
                email: row.email,
                phone: row.phone,
                website: row.website,
                fax: row.fax,
                paymentTerms: row.paymentTerms,
                notes: row.notes,
            },
        });

        existingByName.set(row.name.toLowerCase(), { id: '', name: row.name, typeId });
        createdCount += 1;
    }

    if (duplicateNames.length > 0) {
        console.log(`Skipped ${duplicateNames.length} duplicate rows in seed data`);
    }

    console.log(`Created vendors: ${createdCount}`);
    console.log(`Updated missing vendor types: ${updatedTypeCount}`);
    console.log(`Skipped existing vendors: ${skippedCount}`);
    console.log('Vendor seed complete!');
};

if (process.argv[1]?.endsWith('seed-vendors.ts')) {
    seedVendors()
        .catch((e) => {
            console.error('Vendor seed failed:', e);
            process.exitCode = 1;
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
