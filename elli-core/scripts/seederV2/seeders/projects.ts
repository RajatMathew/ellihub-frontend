import fs from 'node:fs/promises';
import path from 'node:path';

import {
    GCStatus,
    POStatus,
    PaymentTerms,
    ProjectStatus,
    RFQStatus,
    SCOStatus,
    VendorStatus,
} from '@db/enums';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log/service';
import { FileService } from '@modules/file/services';
import { storageService } from '@modules/file/storage';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

import { seedLog } from '../reporter';

type SeedRow = Record<string, unknown>;

type SeedFileRef = {
    id: string;
    objectId: string;
    sourcePath: string;
    name: string;
    displayName?: string | null;
    mimeType: string;
    size?: number | null;
    legacySourceUrl?: string | null;
};

export type ProjectSeed = {
    sourceWorkbook: string;
    project: SeedRow;
    primeContract: SeedRow;
    primeContracts?: SeedRow[];
    rfqs?: SeedRow[];
    rfqLineItems?: SeedRow[];
    rfqAttachments?: SeedRow[];
    purchaseOrders: SeedRow[];
    poLineItems: SeedRow[];
    poPayments: SeedRow[];
    poChangeOrders?: SeedRow[];
    poCoLineItems?: SeedRow[];
};

const defaultSeedFilePath = 'scripts/data/project-seeds/project-ps-341.seed.json';

export type ProjectSeedSummary = {
    sourceWorkbook: string;
    projectName: string;
    jobNumber: string;
    createdProjects: number;
    createdRfqs: number;
    skippedRfqs: number;
    createdPurchaseOrders: number;
    skippedPurchaseOrders: number;
    createdPurchaseOrderLineItems: number;
    skippedPurchaseOrderLineItems: number;
    createdPaidInvoices: number;
    skippedPaidInvoices: number;
    createdSubChangeOrders: number;
    skippedSubChangeOrders: number;
    skippedSubChangeOrdersMissingPo: number;
    linkedPrimeContractDocuments: number;
    linkedScheduleDocuments: number;
    linkedPurchaseOrderDocuments: number;
};

const text = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim() || null;
};

const money = (value: unknown): number => {
    const parsed = Number(text(value) ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const numberOrNull = (value: unknown): number | null => {
    const parsed = Number(text(value) ?? NaN);
    return Number.isFinite(parsed) ? parsed : null;
};

const dateOrNull = (value: unknown): Date | null => {
    const raw = text(value);
    if (!raw) return null;

    const compactDateMatch = /^(\d{1,2})\/(\d{2})(\d{4})$/.exec(raw);
    if (compactDateMatch) {
        const [, month, day, year] = compactDateMatch;
        return new Date(`${year}-${month.padStart(2, '0')}-${day}T00:00:00.000Z`);
    }

    const slashDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    if (slashDateMatch) {
        const [, month, day, year] = slashDateMatch;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00.000Z`);
    }

    const date = new Date(`${raw}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const paymentTermsFromText = (value: unknown): PaymentTerms => {
    const normalized = (text(value) ?? '').toUpperCase().replace(/\s+/g, '_');
    if (normalized.includes('60')) return PaymentTerms.NET_60;
    if (normalized.includes('90')) return PaymentTerms.NET_90;
    if (normalized.includes('45')) return PaymentTerms.NET_45;
    if (normalized.includes('15')) return PaymentTerms.NET_15;
    if (normalized.includes('DUE')) return PaymentTerms.DUE_ON_RECEIPT;
    return PaymentTerms.NET_30;
};

const projectContractTypeFromText = (value: unknown): string => {
    const normalized = (text(value) ?? '').toUpperCase();
    if (normalized.includes('GMP') || normalized.includes('GUARANTEED')) return 'GMP';
    return 'Lump Sum';
};

const projectStageFromText = (value: unknown): string => {
    const normalized = (text(value) ?? 'Onboarding').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (normalized === 'SUMITALS' || normalized === 'SUBMITALS' || normalized === 'SUBMITTALS') {
        return 'SUBMITTALS';
    }
    if (normalized === 'INSTALLATION') return 'INSTALLATION';
    if (normalized === 'FABRICATION') return 'FABRICATION';
    if (normalized === 'ONBOARDING') return 'ONBOARDING';
    return text(value) ?? 'ONBOARDING';
};

const projectStatusFromText = (value: unknown): ProjectStatus => {
    const normalized = (text(value) ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (normalized === 'INACTIVE') return ProjectStatus.INACTIVE;
    if (normalized === 'CLOSED') return ProjectStatus.CLOSED;
    if (normalized === 'COMPLETED' || normalized === 'COMPLETE') return ProjectStatus.COMPLETED;
    return ProjectStatus.ACTIVE;
};

const unitLabelFromText = (value: unknown): string => {
    const normalized = (text(value) ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    if (!normalized) return 'LUMP_SUM';
    if (['EA', 'EACH'].includes(normalized)) return 'EACH';
    if (['LS', 'LUMP_SUM', 'LUMP'].includes(normalized)) return 'LUMP_SUM';
    if (['LF', 'LINEAR_FOOT', 'LINEAR_FEET'].includes(normalized)) return 'LINEAR_FEET';
    if (['SF', 'SQUARE_FOOT', 'SQUARE_FEET'].includes(normalized)) return 'SQUARE_FEET';
    if (['HR', 'HOUR', 'HOURS'].includes(normalized)) return 'HOURS';
    return normalized;
};

const fallbackSeedDate = new Date('2026-01-01T00:00:00.000Z');

const firstDate = (...values: unknown[]): Date => {
    for (const value of values) {
        const date = dateOrNull(value);
        if (date) return date;
    }
    return fallbackSeedDate;
};

const rfqNumberFromValue = (value: unknown): string | null => {
    const raw = text(value);
    if (!raw) return null;
    if (/^RFQ-/i.test(raw)) return raw.toUpperCase();
    return `RFQ-2025-${raw}`;
};

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const poNumberFromValue = (value: unknown): string | null => {
    const raw = text(value);
    if (!raw) return null;
    if (/^PO-/i.test(raw)) return `PO-${raw.slice(3)}`;
    return `PO-${raw}`;
};

const scoNumberFromValue = (
    scoValue: unknown,
    poNumberRaw: string,
    poNumber: string
): string | null => {
    const raw = text(scoValue);
    if (!raw) return null;

    const poNumberRegex = new RegExp(`^${escapeRegExp(poNumber)}-?`, 'i');
    if (poNumberRegex.test(raw)) {
        return raw.replace(poNumberRegex, `${poNumber}-`);
    }

    const prefixRegex = new RegExp(`^${escapeRegExp(poNumberRaw)}-?`, 'i');
    if (prefixRegex.test(raw)) {
        return raw.replace(prefixRegex, `${poNumber}-`);
    }

    return `${poNumber}-${raw}`;
};

const scoStatusFromText = (value: unknown): SCOStatus => {
    const normalized = (text(value) ?? '').toUpperCase();
    if (normalized === 'APPROVED' || normalized === 'CLOSED') return SCOStatus.APPROVED;
    if (normalized === 'REJECTED') return SCOStatus.REJECTED;
    if (normalized === 'VOID' || normalized === 'CANCELLED') return SCOStatus.VOID;
    return SCOStatus.DRAFT;
};

const splitVendorNames = (value: unknown): string[] => {
    const raw = text(value);
    if (!raw || raw.toUpperCase() === 'MULTIPLE') return [];
    return raw
        .split(/\s+\|\s+|\s+\/\s+/)
        .map((part) => part.trim())
        .filter(Boolean);
};

const noteLines = (title: string, values: Record<string, unknown>): string => {
    const lines = Object.entries(values)
        .map(([key, value]) => [key, text(value)] as const)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${value}`);
    return [title, ...lines].join('\n');
};

const externalUrlVariants = (value: string): string[] => {
    const variants = new Set<string>([value]);

    try {
        const url = new URL(value);
        if (url.hostname.endsWith('dropbox.com')) {
            const rawUrl = new URL(value);
            rawUrl.searchParams.delete('dl');
            rawUrl.searchParams.set('raw', '1');
            variants.add(rawUrl.toString());

            const downloadUrl = new URL(value);
            downloadUrl.searchParams.delete('raw');
            downloadUrl.searchParams.set('dl', '1');
            variants.add(downloadUrl.toString());
        }
    } catch {
        // The canonical URL parser above already handles invalid URLs by returning the input.
    }

    return Array.from(variants);
};

const seedFileRef = (value: unknown): SeedFileRef | null => {
    if (!value || typeof value !== 'object') return null;
    const ref = value as Partial<SeedFileRef>;
    if (!ref.id || !ref.objectId || !ref.sourcePath || !ref.name || !ref.mimeType) return null;
    return {
        id: ref.id,
        objectId: ref.objectId,
        sourcePath: ref.sourcePath,
        name: ref.name,
        displayName: ref.displayName,
        mimeType: ref.mimeType,
        size: ref.size,
        legacySourceUrl: ref.legacySourceUrl,
    };
};

const poStatusFromText = (value: unknown): POStatus => {
    const normalized = (text(value) ?? '').toUpperCase();
    if (normalized === 'CANCELLED') return POStatus.CANCELLED;
    if (normalized === 'CLOSED' || normalized === 'DELIVERED') return POStatus.DELIVERED;
    if (normalized === 'ISSUED' || normalized === 'OPEN') return POStatus.ISSUED;
    return POStatus.DRAFT;
};

const parseAddress = (value: unknown) => {
    const raw = text(value);
    if (!raw) {
        return { streetAddress: null, city: null, state: null, zipCode: null };
    }

    const normalized = raw.replace(/,\s*/g, ', ').replace(/\s+/g, ' ').trim();
    const match = /^(.*),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i.exec(normalized);
    if (!match) {
        return { streetAddress: normalized, city: null, state: null, zipCode: null };
    }

    return {
        streetAddress: match[1].trim(),
        city: match[2].trim(),
        state: match[3].toUpperCase(),
        zipCode: match[4],
    };
};

const readSeed = async (seedFilePath = defaultSeedFilePath): Promise<ProjectSeed> => {
    const resolvedSeedFilePath = path.resolve(process.cwd(), seedFilePath);
    const parsed: unknown = JSON.parse(await fs.readFile(resolvedSeedFilePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Project seed file must contain an object');
    }
    return parsed as ProjectSeed;
};

const lookupIdByTypeAndLabel = new Map<string, Promise<string>>();
const ensureLookup = async (type: string, label: string): Promise<string> => {
    const key = `${type}:${label}`;
    const cached = lookupIdByTypeAndLabel.get(key);
    if (cached) return cached;

    const lookupPromise = prisma.lookup
        .upsert({
            where: { type_label: { type, label } },
            update: { label },
            create: { id: generateNanoId(), type, label },
        })
        .then((lookup) => lookup.id)
        .catch((error) => {
            lookupIdByTypeAndLabel.delete(key);
            throw error;
        });
    lookupIdByTypeAndLabel.set(key, lookupPromise);
    return lookupPromise;
};

const stableIndex = (value: string, length: number): number => {
    let hash = 0;
    for (const char of value) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }
    return hash % length;
};

const resolveRandomLeadPm = async (seedKey: string): Promise<string> => {
    const pmUsers = await prisma.user.findMany({
        where: { role: 'pm' },
        select: { id: true },
        orderBy: { email: 'asc' },
    });

    const leadPms = await prisma.employee.findMany({
        where: {
            deletedAt: null,
            userId: { in: pmUsers.map((user) => user.id) },
        },
        orderBy: { name: 'asc' },
    });

    if (leadPms.length === 0) {
        throw new Error(
            'No PM employees found for random Lead_PM assignment. Run the employee seeder before project seeds.'
        );
    }

    return leadPms[stableIndex(seedKey, leadPms.length)].id;
};

const leadPmIdByNameOrEmail = new Map<string, Promise<string>>();
const resolveLeadPm = async (nameOrEmail: string): Promise<string> => {
    if (nameOrEmail.toUpperCase() === 'RANDOM_PM') {
        throw new Error('RANDOM_PM must be resolved with a project seed key.');
    }

    const key = nameOrEmail.toLowerCase();
    const cached = leadPmIdByNameOrEmail.get(key);
    if (cached) return cached;

    const leadPmPromise = prisma.employee
        .findFirst({
            where: {
                deletedAt: null,
                OR: [
                    { email: { equals: nameOrEmail, mode: 'insensitive' } },
                    { name: { equals: nameOrEmail, mode: 'insensitive' } },
                    { name: { contains: nameOrEmail, mode: 'insensitive' } },
                ],
            },
            orderBy: { name: 'asc' },
        })
        .then((leadPm) => {
            if (leadPm) return leadPm.id;
            throw new Error(
                `Lead PM "${nameOrEmail}" was not found in existing employees. Update Lead_PM in the project seed JSON to an existing employee name or email before seeding.`
            );
        })
        .catch((error) => {
            leadPmIdByNameOrEmail.delete(key);
            throw error;
        });
    leadPmIdByNameOrEmail.set(key, leadPmPromise);
    return leadPmPromise;
};

const gcIdByName = new Map<string, Promise<string>>();
const ensureGc = async (name: string, contact: SeedRow): Promise<string> => {
    const key = name.toLowerCase();
    const cached = gcIdByName.get(key);
    if (cached) return cached;

    const gcPromise = (async () => {
        const existing = await prisma.generalContractor.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (existing) return existing.id;

        const gcTypeId = await ensureLookup(LookupType.GC_TYPE, 'Private');
        const created = await prisma.generalContractor.create({
            data: {
                id: generateNanoId(),
                name,
                gcTypeId,
                status: GCStatus.ACTIVE,
                email: text(contact['GC_Contact_Email']),
                phone: text(contact['GC_Contact_Phone']),
                paymentTerms: paymentTermsFromText(contact.Payment_Terms),
                retainagePercent: 10,
            },
        });
        return created.id;
    })().catch((error) => {
        gcIdByName.delete(key);
        throw error;
    });
    gcIdByName.set(key, gcPromise);
    return gcPromise;
};

const ensureGcContact = async (generalContractorId: string, contact: SeedRow): Promise<void> => {
    const fullName = text(contact['GC_Contact_Name']);
    if (!fullName) return;

    const existing = await prisma.contact.findFirst({
        where: { generalContractorId, fullName: { equals: fullName, mode: 'insensitive' } },
    });
    if (existing) return;

    const existingPrimary = await prisma.contact.findFirst({
        where: { generalContractorId, isPrimary: true, deletedAt: null },
        select: { id: true },
    });

    await prisma.contact.create({
        data: {
            id: generateNanoId(),
            fullName,
            email: text(contact['GC_Contact_Email']),
            phoneNumber: text(contact['GC_Contact_Phone']),
            tags: ['Project seed'],
            isPrimary: !existingPrimary,
            generalContractorId,
        },
    });
};

const vendorIdByName = new Map<string, Promise<string>>();
const ensureVendor = async (name: string): Promise<string> => {
    const key = name.toLowerCase();
    const cached = vendorIdByName.get(key);
    if (cached) return cached;

    const vendorPromise = (async () => {
        const existing = await prisma.vendor.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (existing) return existing.id;

        const created = await prisma.vendor.create({
            data: {
                id: generateNanoId(),
                name,
                status: VendorStatus.ACTIVE,
                categoryTags: ['Project seed'],
                paymentTerms: PaymentTerms.NET_30,
                notes: 'Created from PS 341Q project workbook seed',
            },
        });
        return created.id;
    })().catch((error) => {
        vendorIdByName.delete(key);
        throw error;
    });
    vendorIdByName.set(key, vendorPromise);
    return vendorPromise;
};

const ensureProjectFolder = async (projectId: string, projectName: string, userId: string) => {
    const existing = await prisma.file.findFirst({
        where: { name: projectId, protectedFolderType: 'PROJECT_ROOT', type: 'FOLDER' },
    });
    if (existing) return;

    await prisma.$transaction(async (tx) => {
        await FileService.createProjectFolders(tx, projectId, projectName, userId);
    });
};

const uploadSeedBlobIfMissing = async (ref: SeedFileRef, shouldCheckStorage: boolean) => {
    if (shouldCheckStorage) {
        if (await storageService.exists(ref.objectId)) {
            return;
        }
    }

    const sourcePath = path.resolve(process.cwd(), ref.sourcePath);
    const content = await fs.readFile(sourcePath);
    const writer = storageService.createWriter(ref.objectId, ref.mimeType);

    try {
        writer.write(content);
        await writer.end();
    } catch (error) {
        await Promise.resolve(
            writer.end(error instanceof Error ? error : new Error(String(error)))
        ).catch(() => undefined);
        throw error;
    }
};

const ensureSeedFile = async ({
    ref,
    folderId,
    userId,
    isDeletable = true,
}: {
    ref: SeedFileRef;
    folderId: string;
    userId: string;
    isDeletable?: boolean;
}) => {
    const legacyObjectIds = ref.legacySourceUrl ? externalUrlVariants(ref.legacySourceUrl) : [];
    const existing =
        (await prisma.file.findUnique({ where: { id: ref.id } })) ??
        (await prisma.file.findFirst({
            where: {
                objectId: { in: [ref.objectId, ...legacyObjectIds] },
                type: 'FILE',
                deletedAt: null,
            },
        }));

    if (existing) {
        const isAlreadyBlobBacked = existing.objectId === ref.objectId;
        await uploadSeedBlobIfMissing(ref, !isAlreadyBlobBacked);

        const needsUpdate =
            existing.name !== ref.name ||
            existing.objectId !== ref.objectId ||
            existing.mimeType !== ref.mimeType ||
            existing.size !== (ref.size ?? null) ||
            existing.parentId !== folderId ||
            existing.displayName !== (ref.displayName ?? null) ||
            existing.isDeletable !== isDeletable;

        return needsUpdate
            ? await prisma.file.update({
                  where: { id: existing.id },
                  data: {
                      name: ref.name,
                      objectId: ref.objectId,
                      mimeType: ref.mimeType,
                      size: ref.size ?? null,
                      parentId: folderId,
                      displayName: ref.displayName ?? null,
                      isDeletable,
                  },
              })
            : existing;
    }

    await uploadSeedBlobIfMissing(ref, true);

    const file = await prisma.file.create({
        data: {
            id: ref.id,
            name: ref.name,
            displayName: ref.displayName,
            objectId: ref.objectId,
            mimeType: ref.mimeType,
            size: ref.size ?? null,
            parentId: folderId,
            type: 'FILE',
            createdBy: userId,
            isDeletable,
        },
    });

    await ActivityLogService.log({
        userId,
        entityType: 'file',
        entityId: file.id,
        action: 'create',
        description: `Seeded file ${file.name}`,
        affectedEntityIds: [folderId],
    });

    return file;
};

const ensurePrimeContractDocument = async (
    projectId: string,
    projectName: string,
    fileRef: SeedFileRef | null,
    userId: string
): Promise<boolean> => {
    if (!fileRef) return false;

    const folderId = await FileService.getProjectSubFolderId(projectId, 'PRIME_CONTRACT');
    const file = await ensureSeedFile({
        ref: fileRef,
        folderId,
        userId,
        isDeletable: false,
    });

    const existing = await prisma.primeContract.findUnique({
        where: { projectId_fileId: { projectId, fileId: file.id } },
    });
    if (existing) return false;

    await prisma.primeContract.updateMany({
        where: { projectId, isPrimary: true },
        data: { isPrimary: false },
    });

    await prisma.primeContract.create({
        data: {
            id: generateNanoId(),
            projectId,
            fileId: file.id,
            isPrimary: true,
            uploadedAt: new Date(),
        },
    });

    return true;
};

const ensureScheduleDocument = async (
    projectId: string,
    projectName: string,
    fileRef: SeedFileRef | null,
    scheduleDate: Date | null,
    userId: string
): Promise<boolean> => {
    if (!fileRef) return false;

    const folderId = await FileService.getProjectSubFolderId(projectId, 'SCHEDULE');
    const file = await ensureSeedFile({
        ref: fileRef,
        folderId,
        userId,
    });

    const existing = await prisma.projectSchedule.findUnique({ where: { fileId: file.id } });
    if (existing) return false;

    await prisma.projectSchedule.create({
        data: {
            id: generateNanoId(),
            projectId,
            fileId: file.id,
            date: scheduleDate ?? new Date(),
            description: `${projectName} contract schedule`,
            notes: 'Seeded from local project document',
        },
    });

    return true;
};

const ensureRfqAttachment = async (
    rfqId: string,
    projectId: string,
    projectName: string,
    rfqNumber: string,
    row: SeedRow,
    userId: string
): Promise<boolean> => {
    void projectId;
    void projectName;
    void rfqNumber;
    void userId;

    if (text(row.Document_Link)) {
        seedLog.warn('Skipping RFQ attachment with unsupported external document link');
    }

    return false;
};

const ensurePoAttachment = async (
    purchaseOrderId: string,
    projectId: string,
    poNumber: string,
    url: string | null,
    userId: string
): Promise<boolean> => {
    void purchaseOrderId;
    void projectId;
    void poNumber;
    void userId;

    if (url) {
        seedLog.warn('Skipping PO attachment with unsupported external document link');
    }

    return false;
};

const ensureScoAttachment = async (
    scoId: string,
    projectId: string,
    scoNumber: string,
    url: string | null,
    userId: string
): Promise<boolean> => {
    void scoId;
    void projectId;
    void scoNumber;
    void userId;

    if (url) {
        seedLog.warn('Skipping SCO attachment with unsupported external document link');
    }

    return false;
};

const seedRfqs = async (
    seed: ProjectSeed,
    project: {
        id: string;
        name: string;
        estimatedEndDate: Date | null;
        estimatedStartDate: Date | null;
    },
    userId: string
): Promise<{
    rfqIdsByWorkbookId: Map<string, string>;
    createdCount: number;
    skippedCount: number;
}> => {
    const rfqIdsByWorkbookId = new Map<string, string>();
    let createdCount = 0;
    let skippedCount = 0;
    const rfqTypeId = await ensureLookup(LookupType.TRADE_CATEGORY, 'MATERIAL');

    for (const rfqRow of seed.rfqs ?? []) {
        const workbookRfqId = text(rfqRow.RFQ_ID);
        const rfqNumber = rfqNumberFromValue(workbookRfqId);
        if (!workbookRfqId || !rfqNumber) continue;

        const attachmentsWithoutLinks = (seed.rfqAttachments ?? []).filter(
            (row) => text(row.RFQ_ID) === workbookRfqId && !text(row.Document_Link)
        );
        const descriptionParts = [
            noteLines(`Seeded from ${seed.sourceWorkbook}`, {
                Excel_RFQ_ID: workbookRfqId,
                Vendor: rfqRow.Vendor,
                Status: rfqRow.Status,
                Final_Amount: rfqRow.Final_Amount,
                Issued_Date: rfqRow['Issued Date'],
            }),
        ];
        if (attachmentsWithoutLinks.length) {
            descriptionParts.push(
                `Workbook attachment rows without document links: ${attachmentsWithoutLinks.length}`
            );
        }

        let rfq = await prisma.rFQ.findUnique({ where: { rfqNumber } });
        if (!rfq) {
            rfq = await prisma.rFQ.create({
                data: {
                    id: generateNanoId(),
                    projectId: project.id,
                    rfqNumber,
                    title: text(rfqRow.Title) ?? rfqNumber,
                    description: descriptionParts.join('\n\n'),
                    status: RFQStatus.DRAFT,
                    bidDeadline: firstDate(
                        rfqRow['Issued Date'],
                        project.estimatedEndDate,
                        project.estimatedStartDate
                    ),
                    typeId: rfqTypeId,
                    createdBy: userId,
                },
            });
            createdCount += 1;
        } else {
            skippedCount += 1;
        }
        rfqIdsByWorkbookId.set(workbookRfqId, rfq.id);

        const lineRows = (seed.rfqLineItems ?? []).filter(
            (row) => text(row.RFQ_ID) === workbookRfqId
        );
        const rowsToSeed =
            lineRows.length > 0
                ? lineRows
                : [{ Item: text(rfqRow.Title) ?? rfqNumber, Unit: 'LUMP_SUM', Qty: '1' }];
        for (const [index, lineRow] of rowsToSeed.entries()) {
            const name = text(lineRow.Item) ?? `${rfqNumber} deliverable ${index + 1}`;
            const existing = await prisma.rFQDeliverable.findFirst({
                where: { rfqId: rfq.id, name, deletedAt: null },
            });
            if (existing) continue;

            const unitId = await ensureLookup(LookupType.UNIT, unitLabelFromText(lineRow.Unit));
            await prisma.rFQDeliverable.create({
                data: {
                    id: generateNanoId(),
                    rfqId: rfq.id,
                    name,
                    unitId,
                    quantity: money(lineRow.Qty) || 1,
                },
            });
        }

        for (const vendorName of splitVendorNames(rfqRow.Vendor)) {
            const vendorId = await ensureVendor(vendorName);
            const existingQuote = await prisma.rFQVendorQuote.findUnique({
                where: { rfqId_vendorId: { rfqId: rfq.id, vendorId } },
            });
            if (existingQuote) continue;
            const quotedAmount = numberOrNull(rfqRow.Final_Amount);
            await prisma.rFQVendorQuote.create({
                data: {
                    id: generateNanoId(),
                    rfqId: rfq.id,
                    vendorId,
                    hasSubmittedQuote: quotedAmount !== null,
                    submittedAt: dateOrNull(rfqRow['Issued Date']),
                    quotedAmount,
                    notes: noteLines(`Seeded vendor quote from ${seed.sourceWorkbook}`, {
                        Excel_RFQ_ID: workbookRfqId,
                        Raw_Vendor_Cell: rfqRow.Vendor,
                    }),
                },
            });
        }

        for (const attachmentRow of (seed.rfqAttachments ?? []).filter(
            (row) => text(row.RFQ_ID) === workbookRfqId
        )) {
            await ensureRfqAttachment(
                rfq.id,
                project.id,
                project.name,
                rfqNumber,
                attachmentRow,
                userId
            );
        }
    }

    return { rfqIdsByWorkbookId, createdCount, skippedCount };
};

const seedSubChangeOrders = async (
    seed: ProjectSeed,
    project: { id: string; estimatedStartDate: Date | null; estimatedEndDate: Date | null },
    userId: string,
    poIdsByWorkbookId: Map<string, { id: string; vendorId: string }>
): Promise<{ createdCount: number; skippedCount: number; skippedMissingPoCount: number }> => {
    let createdCount = 0;
    let skippedCount = 0;
    let skippedMissingPoCount = 0;
    const changeTypeId = await ensureLookup(LookupType.SCO_CHANGE_TYPE, 'Other');

    for (const coRow of seed.poChangeOrders ?? []) {
        const scoNumberRaw = text(coRow.PO_CO_ID);
        const poNumberRaw = text(coRow.PO_ID);
        if (!scoNumberRaw || !poNumberRaw) continue;

        const po = poIdsByWorkbookId.get(poNumberRaw);
        if (!po) {
            skippedMissingPoCount += 1;
            continue;
        }

        const poNumber = poNumberFromValue(poNumberRaw)!;
        const scoNumber = scoNumberFromValue(scoNumberRaw, poNumberRaw, poNumber)!;

        let sco = await prisma.subChangeOrder.findUnique({ where: { scoNumber } });
        if (!sco) {
            sco = await prisma.subChangeOrder.create({
                data: {
                    id: generateNanoId(),
                    projectId: project.id,
                    purchaseOrderId: po.id,
                    scoNumber,
                    date: firstDate(
                        coRow.Approval_Date,
                        coRow.Due_Date,
                        project.estimatedStartDate,
                        project.estimatedEndDate
                    ),
                    title: text(coRow.Name) ?? scoNumber,
                    description: [
                        text(coRow.Description),
                        noteLines(`Seeded from ${seed.sourceWorkbook}`, {
                            Reason: coRow.Reason,
                            Schedule_Impact_Days: coRow.Schedule_Impact_Days,
                            Markup_Pct: coRow.Markup_Pct,
                            Creator: coRow.Creator,
                            Assignee: coRow.Assignee,
                            Due_Date: coRow.Due_Date,
                            Approval_Date: coRow.Approval_Date,
                            Document_Link: coRow.Document_Link,
                        }),
                    ]
                        .filter(Boolean)
                        .join('\n\n'),
                    amount: money(coRow.Amount),
                    status: scoStatusFromText(coRow.Status),
                    createdBy: userId,
                    changeTypeId,
                    approvedAt:
                        scoStatusFromText(coRow.Status) === SCOStatus.APPROVED
                            ? dateOrNull(coRow.Approval_Date)
                            : null,
                },
            });
            createdCount += 1;
        } else {
            skippedCount += 1;
        }

        const lineRows = (seed.poCoLineItems ?? []).filter(
            (row) => text(row.PO_CO_ID) === scoNumberRaw
        );
        const rowsToSeed =
            lineRows.length > 0
                ? lineRows
                : [{ Item: text(coRow.Name) ?? scoNumber, Qty: '1', Unit_Price: coRow.Amount }];
        for (const [index, lineRow] of rowsToSeed.entries()) {
            const sequenceNumber = index + 1;
            const existingLine = await prisma.subCOLineItem.findUnique({
                where: { subCoId_sequenceNumber: { subCoId: sco.id, sequenceNumber } },
            });
            if (existingLine) continue;

            const unitId = await ensureLookup(
                LookupType.UNIT,
                unitLabelFromText(lineRow.Unit_Type ?? lineRow.Unit)
            );
            const quantity = money(lineRow.Qty) || 1;
            const unitPrice = numberOrNull(lineRow.Unit_Price) ?? numberOrNull(coRow.Amount) ?? 0;
            await prisma.subCOLineItem.create({
                data: {
                    id: generateNanoId(),
                    subCoId: sco.id,
                    sequenceNumber,
                    description: text(lineRow.Item) ?? `${scoNumber} line item`,
                    quantity,
                    unitId,
                    unitPrice,
                    amount:
                        numberOrNull(lineRow.Price) ??
                        numberOrNull(coRow.Amount) ??
                        quantity * unitPrice,
                    costCodeId: null,
                },
            });
        }

        await ensureScoAttachment(sco.id, project.id, scoNumber, text(coRow.Document_Link), userId);
    }

    return { createdCount, skippedCount, skippedMissingPoCount };
};

export const seedProjectSeed = async (
    seed: ProjectSeed,
    userId: string
): Promise<ProjectSeedSummary> => {
    const projectName = text(seed.project.Project_Name) ?? 'PS 341Q';
    const projectDescription =
        text(seed.project.Project_Description) ?? `Seeded from ${seed.sourceWorkbook}`;
    const jobNumber = text(seed.project.Project_Number) ?? '30500';
    const projectAddress = parseAddress(seed.project.Address);
    const primeContract = seed.primeContract;
    const paymentTerms = paymentTermsFromText(
        seed.project.Payment_Terms ?? primeContract.Payment_Terms
    );
    const gcId = await ensureGc(text(seed.project.GC_Name) ?? 'Navillus', primeContract);
    await ensureGcContact(gcId, primeContract);
    for (const contactRow of seed.primeContracts ?? []) {
        await ensureGcContact(gcId, contactRow);
    }
    const stageId = await ensureLookup(
        LookupType.PROJECT_STAGE,
        projectStageFromText(seed.project.Normalized_Stage ?? seed.project.Stage)
    );
    const divisionId = await ensureLookup(
        LookupType.PROJECT_DIVISION,
        text(seed.project.Division ?? seed.project.Contract_Category) ?? 'SCA'
    );
    const targetBudgetPercent = numberOrNull(seed.project.Target_Budget_Percent);
    const tcoDate = dateOrNull(seed.project.TCO_Date);
    const projectStatus = projectStatusFromText(seed.project.Project_Status);
    const contractValue = money(primeContract.Original_Contract_Value);
    const contractType = projectContractTypeFromText(seed.project.Contract_Type);
    const retainagePercent = numberOrNull(seed.project.Retainage_Percent) ?? 10;
    const taxRate = numberOrNull(seed.project.Tax_Rate) ?? 0;
    const leadPmName = text(seed.project.Lead_PM);
    let leadPMId: string;
    if (!leadPmName || leadPmName.toUpperCase() === 'RANDOM_PM') {
        const seedKey = `${jobNumber}:${projectName}`;
        leadPMId = await resolveRandomLeadPm(seedKey);
    } else {
        leadPMId = await resolveLeadPm(leadPmName);
    }

    let project = await prisma.project.findFirst({ where: { jobNumber } });
    let createdProjectCount = 0;
    if (!project) {
        project = await prisma.project.create({
            data: {
                id: generateNanoId(),
                name: projectName,
                description: projectDescription,
                jobNumber,
                contractNumber: text(primeContract.Contract_ID),
                stageId,
                divisionId,
                status: projectStatus,
                ...projectAddress,
                estimatedStartDate: null,
                estimatedEndDate: null,
                gcId,
                leadPMId,
                contractValue,
                contractType,
                retainagePercent,
                targetBudgetPercent,
                taxRate,
                paymentTerms,
                actualStartDate: null,
                actualCompletionDate: null,
                tcoDate,
            },
        });
        createdProjectCount = 1;
    } else if (
        project.divisionId !== divisionId ||
        project.stageId !== stageId ||
        project.status !== projectStatus ||
        project.gcId !== gcId ||
        project.leadPMId !== leadPMId ||
        project.name !== projectName ||
        project.description !== projectDescription ||
        project.contractNumber !== text(primeContract.Contract_ID) ||
        project.contractType !== contractType ||
        Number(project.contractValue) !== Number(contractValue) ||
        Number(project.retainagePercent ?? 0) !== Number(retainagePercent) ||
        Number(project.targetBudgetPercent ?? 0) !== Number(targetBudgetPercent ?? 0) ||
        Number(project.taxRate ?? 0) !== Number(taxRate) ||
        project.paymentTerms !== paymentTerms ||
        project.streetAddress !== projectAddress.streetAddress ||
        project.city !== projectAddress.city ||
        project.state !== projectAddress.state ||
        project.zipCode !== projectAddress.zipCode ||
        project.estimatedStartDate !== null ||
        project.estimatedEndDate !== null ||
        project.actualStartDate !== null ||
        project.actualCompletionDate !== null ||
        Number(project.tcoDate?.getTime() ?? 0) !== Number(tcoDate?.getTime() ?? 0)
    ) {
        project = await prisma.project.update({
            where: { id: project.id },
            data: {
                name: projectName,
                description: projectDescription,
                contractNumber: text(primeContract.Contract_ID),
                stageId,
                divisionId,
                status: projectStatus,
                ...projectAddress,
                gcId,
                leadPMId,
                contractValue,
                contractType,
                retainagePercent,
                targetBudgetPercent,
                taxRate,
                paymentTerms,
                // Imported seed projects only keep TCO at the project level; schedule dates come from schedule records.
                estimatedStartDate: null,
                estimatedEndDate: null,
                actualStartDate: null,
                actualCompletionDate: null,
                tcoDate,
            },
        });
    }

    await ensureProjectFolder(project.id, project.name, userId);

    const linkedPrimeContractDocument = await ensurePrimeContractDocument(
        project.id,
        project.name,
        seedFileRef(primeContract.Contract_Document_File),
        userId
    );
    const linkedScheduleDocument = await ensureScheduleDocument(
        project.id,
        project.name,
        seedFileRef(primeContract.Contract_Scheduled_Document_File),
        null,
        userId
    );

    const teamMember = await prisma.projectTeamMember.findUnique({
        where: { employeeId_projectId: { employeeId: leadPMId, projectId: project.id } },
    });
    if (!teamMember) {
        await prisma.projectTeamMember.updateMany({
            where: { projectId: project.id, isLead: true },
            data: { isLead: false, role: 'PM' },
        });
        await prisma.projectTeamMember.create({
            data: { employeeId: leadPMId, projectId: project.id, role: 'Lead PM', isLead: true },
        });
    } else if (!teamMember.isLead || teamMember.role !== 'Lead PM') {
        await prisma.projectTeamMember.updateMany({
            where: { projectId: project.id, isLead: true, employeeId: { not: leadPMId } },
            data: { isLead: false, role: 'PM' },
        });
        await prisma.projectTeamMember.update({
            where: { employeeId_projectId: { employeeId: leadPMId, projectId: project.id } },
            data: { role: 'Lead PM', isLead: true },
        });
    }

    const seededRfqs = await seedRfqs(
        seed,
        {
            id: project.id,
            name: project.name,
            estimatedEndDate: project.estimatedEndDate,
            estimatedStartDate: project.estimatedStartDate,
        },
        userId
    );

    const poIdsByWorkbookId = new Map<string, { id: string; vendorId: string }>();
    let createdPoCount = 0;
    let skippedPoCount = 0;
    let linkedPoAttachmentCount = 0;

    for (const poRow of seed.purchaseOrders) {
        const poNumberRaw = text(poRow.PO_ID);
        const vendorName = text(poRow.Vendor);
        if (!poNumberRaw || !vendorName) continue;

        const poNumber = poNumberFromValue(poNumberRaw)!;

        const existingPo = await prisma.purchaseOrder.findUnique({ where: { poNumber } });
        if (existingPo) {
            const linkedRfqId = seededRfqs.rfqIdsByWorkbookId.get(text(poRow.Linked_RFQ_ID) ?? '');
            if (linkedRfqId && !existingPo.rfqId) {
                await prisma.purchaseOrder.update({
                    where: { id: existingPo.id },
                    data: { rfqId: linkedRfqId },
                });
            }
            linkedPoAttachmentCount += (await ensurePoAttachment(
                existingPo.id,
                project.id,
                poNumber,
                text(poRow.Document_Link),
                userId
            ))
                ? 1
                : 0;
            poIdsByWorkbookId.set(poNumberRaw, { id: existingPo.id, vendorId: existingPo.vendorId });
            skippedPoCount += 1;
            continue;
        }

        const vendorId = await ensureVendor(vendorName);
        const linkedRfqId = seededRfqs.rfqIdsByWorkbookId.get(text(poRow.Linked_RFQ_ID) ?? '');
        const tradeCategoryId = await ensureLookup(
            LookupType.TRADE_CATEGORY,
            text(poRow.Trade) ?? 'MATERIAL'
        );
        const subtotal = money(poRow.PO_Amount);
        const taxPercent = money(poRow.Tax_Rate);
        const taxAmount = taxPercent > 0 ? subtotal * (taxPercent / 100) : null;
        const total = subtotal + (taxAmount ?? 0);

        const createdPo = await prisma.purchaseOrder.create({
            data: {
                id: generateNanoId(),
                projectId: project.id,
                vendorId,
                rfqId: linkedRfqId,
                poNumber,
                tradeCategoryId,
                description: text(poRow.Notes),
                status: poStatusFromText(poRow.Status),
                leadTime: text(poRow.Lead_Time),
                shipToAddress: text(poRow.Ship_To),
                expectedDate: dateOrNull(poRow.Expected_Date),
                deliveryDate: dateOrNull(poRow.Delivery_Date),
                subtotal,
                taxPercent: taxPercent || null,
                taxAmount,
                total,
                retainagePercent: 0,
                paymentTerms: paymentTermsFromText(poRow.Payment_Terms),
                notes: text(poRow.Document_Link)
                    ? `Document link: ${text(poRow.Document_Link)}`
                    : text(poRow.Notes),
                issuedBy: text(poRow.Created_By) ?? userId,
                issuedAt: dateOrNull(poRow.Issue_Date),
                createdBy: userId,
            },
        });

        poIdsByWorkbookId.set(poNumberRaw, { id: createdPo.id, vendorId });
        linkedPoAttachmentCount += (await ensurePoAttachment(
            createdPo.id,
            project.id,
            poNumber,
            text(poRow.Document_Link),
            userId
        ))
            ? 1
            : 0;
        createdPoCount += 1;
    }

    let createdLineItemCount = 0;
    let skippedLineItemCount = 0;
    const lineNumberByPoId = new Map<string, number>();
    for (const lineRow of seed.poLineItems) {
        const poNumber = text(lineRow.PO_ID);
        if (!poNumber) continue;

        const po = poIdsByWorkbookId.get(poNumber);
        if (!po) continue;

        const nextLine = (lineNumberByPoId.get(po.id) ?? 0) + 1;
        lineNumberByPoId.set(po.id, nextLine);
        const existing = await prisma.purchaseOrderLineItem.findUnique({
            where: { purchaseOrderId_lineNumber: { purchaseOrderId: po.id, lineNumber: nextLine } },
        });
        if (existing) {
            skippedLineItemCount += 1;
            continue;
        }

        const quantity = money(lineRow.Qty) || 1;
        const unitPrice = money(lineRow.Unit_Price);
        const lineUnitId = await ensureLookup(LookupType.UNIT, unitLabelFromText(lineRow.Unit));
        await prisma.purchaseOrderLineItem.create({
            data: {
                id: generateNanoId(),
                purchaseOrderId: po.id,
                lineNumber: nextLine,
                description: text(lineRow.Item) ?? `PO ${poNumber} line item`,
                unitId: lineUnitId,
                quantity,
                unitPrice,
                amount: money(lineRow.Price) || quantity * unitPrice,
                notes: text(lineRow.Unit) ? `Excel unit: ${text(lineRow.Unit)}` : null,
            },
        });
        createdLineItemCount += 1;
    }

    let createdInvoiceCount = 0;
    let skippedInvoiceCount = 0;
    const paymentSequenceByPo = new Map<string, number>();
    for (const paymentRow of seed.poPayments) {
        const poNumber = text(paymentRow.PO_ID);
        if (!poNumber) continue;

        const po = poIdsByWorkbookId.get(poNumber);
        if (!po) continue;

        const nextSequence = (paymentSequenceByPo.get(poNumber) ?? 0) + 1;
        paymentSequenceByPo.set(poNumber, nextSequence);
        const invoiceNumber = `${poNumber}-PAY-${String(nextSequence).padStart(2, '0')}`;
        const existing = await prisma.invoice.findUnique({
            where: { invoiceNumber_vendorId: { invoiceNumber, vendorId: po.vendorId } },
        });
        if (existing) {
            skippedInvoiceCount += 1;
            continue;
        }

        const paymentDate = dateOrNull(paymentRow.Date) ?? new Date();
        await prisma.invoice.create({
            data: {
                id: generateNanoId(),
                projectId: project.id,
                vendorId: po.vendorId,
                purchaseOrderId: po.id,
                invoiceNumber,
                invoiceDate: paymentDate,
                dueDate: paymentDate,
                totalAmount: money(paymentRow.Amount),
                notes: text(paymentRow.Note),
                paidDate: paymentDate,
                paymentReference: text(paymentRow['CHK#']),
                paymentNotes: text(paymentRow.Note),
                isPaid: true,
                relatedSCOIds: [],
            },
        });
        createdInvoiceCount += 1;
    }

    const seededSubChangeOrders = await seedSubChangeOrders(
        seed,
        {
            id: project.id,
            estimatedStartDate: project.estimatedStartDate,
            estimatedEndDate: project.estimatedEndDate,
        },
        userId,
        poIdsByWorkbookId
    );

    return {
        sourceWorkbook: seed.sourceWorkbook,
        projectName,
        jobNumber,
        createdProjects: createdProjectCount,
        createdRfqs: seededRfqs.createdCount,
        skippedRfqs: seededRfqs.skippedCount,
        createdPurchaseOrders: createdPoCount,
        skippedPurchaseOrders: skippedPoCount,
        createdPurchaseOrderLineItems: createdLineItemCount,
        skippedPurchaseOrderLineItems: skippedLineItemCount,
        createdPaidInvoices: createdInvoiceCount,
        skippedPaidInvoices: skippedInvoiceCount,
        createdSubChangeOrders: seededSubChangeOrders.createdCount,
        skippedSubChangeOrders: seededSubChangeOrders.skippedCount,
        skippedSubChangeOrdersMissingPo: seededSubChangeOrders.skippedMissingPoCount,
        linkedPrimeContractDocuments: linkedPrimeContractDocument ? 1 : 0,
        linkedScheduleDocuments: linkedScheduleDocument ? 1 : 0,
        linkedPurchaseOrderDocuments: linkedPoAttachmentCount,
    };
};

export const seedProject = async (
    seedFilePath: string,
    userId: string
): Promise<ProjectSeedSummary> => {
    const seed = await readSeed(seedFilePath);
    return seedProjectSeed(seed, userId);
};

export const seedGeneratedProjectSeeds = async (
    userId: string,
    options: {
        count: number;
        createSeed: (index: number) => ProjectSeed;
        label?: string;
        progressEvery?: number;
        concurrency?: number;
    }
): Promise<ProjectSeedSummary[]> => {
    const label = options.label ?? 'generated project';
    const progressEvery = options.progressEvery ?? 0;
    const concurrency = Math.max(1, Math.floor(options.concurrency ?? 1));
    const summaries: ProjectSeedSummary[] = [];

    seedLog.info(`Will generate ${options.count} ${label} seeds in memory during import`);

    let nextIndex = 1;
    let completedCount = 0;

    const worker = async () => {
        while (nextIndex <= options.count) {
            const index = nextIndex;
            nextIndex += 1;

            const seed = options.createSeed(index);
            summaries[index - 1] = await seedProjectSeed(seed, userId);

            completedCount += 1;
            if (progressEvery > 0 && completedCount % progressEvery === 0) {
                seedLog.info(`Imported ${completedCount}/${options.count} ${label} seeds`);
            }
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, options.count) }, () => worker()));
    return summaries;
};

export const seedProjectWorkbooks = async (
    userId: string,
    options: {
        seedDirectory?: string;
        label?: string;
        logEachWorkbook?: boolean;
        progressEvery?: number;
    } = {}
): Promise<ProjectSeedSummary[]> => {
    const seedDirectory = options.seedDirectory ?? 'scripts/data/project-seeds';
    const label = options.label ?? 'project workbook';
    const logEachWorkbook = options.logEachWorkbook ?? true;
    const progressEvery = options.progressEvery ?? 0;
    const projectSeedDirectory = path.resolve(process.cwd(), seedDirectory);
    const entries = await fs.readdir(projectSeedDirectory);
    const projectSeedFiles = entries.filter((entry) => entry.endsWith('.seed.json')).sort();
    const summaries: ProjectSeedSummary[] = [];

    seedLog.info(`Found ${projectSeedFiles.length} ${label} seed files`);

    for (const [index, seedFile] of projectSeedFiles.entries()) {
        const relativeSeedPath = path.join(seedDirectory, seedFile);
        const key = `project:${seedFile}`;
        if (logEachWorkbook) {
            seedLog.start(key, `[${index + 1}/${projectSeedFiles.length}] ${seedFile}`);
        }

        const summary = await seedProject(relativeSeedPath, userId);
        summaries.push(summary);

        if (logEachWorkbook) {
            seedLog.done(key, `${summary.jobNumber} - ${summary.projectName}`);
            seedLog.table('Workbook summary', [
                { label: 'Source', value: summary.sourceWorkbook },
                { label: 'Projects', value: summary.createdProjects },
                { label: 'RFQs', value: summary.createdRfqs },
                { label: 'POs', value: summary.createdPurchaseOrders },
                { label: 'PO lines', value: summary.createdPurchaseOrderLineItems },
                { label: 'Paid invoices', value: summary.createdPaidInvoices },
                { label: 'SCOs', value: summary.createdSubChangeOrders },
                {
                    label: 'Documents',
                    value:
                        summary.linkedPrimeContractDocuments +
                        summary.linkedScheduleDocuments +
                        summary.linkedPurchaseOrderDocuments,
                },
            ]);
        } else if (progressEvery > 0 && (index + 1) % progressEvery === 0) {
            seedLog.info(`Imported ${index + 1}/${projectSeedFiles.length} ${label} files`);
        }
    }

    return summaries;
};
