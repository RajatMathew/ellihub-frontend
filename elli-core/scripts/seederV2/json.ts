import fs from 'node:fs/promises';
import path from 'node:path';

import { GCStatus, PaymentTerms, VendorStatus } from '@db/enums';

import type { GcContactSeedRow, GcSeedRow, VendorSeedRow } from './data';

const nullableString = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim() || null;
};

const readJsonArray = async (filePath: string): Promise<unknown[]> => {
    const contents = await fs.readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(contents);

    if (!Array.isArray(parsed)) {
        throw new Error(`${path.basename(filePath)} must contain an array`);
    }

    return parsed;
};

const isVendorStatus = (value: string): value is VendorStatus =>
    Object.values(VendorStatus).includes(value as VendorStatus);

const isGcStatus = (value: string): value is GCStatus =>
    Object.values(GCStatus).includes(value as GCStatus);

const isPaymentTerms = (value: string): value is PaymentTerms =>
    Object.values(PaymentTerms).includes(value as PaymentTerms);

export const readVendorSeedRows = async (): Promise<VendorSeedRow[]> => {
    const rows = await readJsonArray(
        path.resolve(process.cwd(), 'scripts/data/vendor-list.seed.json')
    );

    return rows.map((row, index) => {
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

export const readGcSeedRows = async (): Promise<GcSeedRow[]> => {
    const rows = await readJsonArray(path.resolve(process.cwd(), 'scripts/data/gc-list.seed.json'));

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

export const readGcContactSeedRows = async (): Promise<GcContactSeedRow[]> => {
    const rows = await readJsonArray(
        path.resolve(process.cwd(), 'scripts/data/gc-contact-list.seed.json')
    );

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
