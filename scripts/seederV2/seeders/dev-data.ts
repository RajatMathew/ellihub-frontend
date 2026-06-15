import { auth } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { FileService } from '@modules/file/services';
import { LookupType } from '@modules/lookup/models';
import { generateNanoId } from '@utils/generateNanoId';

import { employeeSeeds } from '../data';
import {
    generateExtraMockProjectSeed,
    resolveExtraMockGenerationOptions,
    summarizeExtraMockProjectSeeds,
} from '../generate-extra-mock-projects';
import { readGcContactSeedRows, readGcSeedRows, readVendorSeedRows } from '../json';
import { seedLog } from '../reporter';

import {
    seedGeneratedProjectSeeds,
    seedProjectWorkbooks as seedV2ProjectWorkbooks,
} from './projects';

import type { ExtraMockGenerationOptions } from '../generate-extra-mock-projects';

const getLookupId = async (type: string, label: string): Promise<string> => {
    const lookup = await prisma.lookup.findUnique({ where: { type_label: { type, label } } });
    if (!lookup) throw new Error(`Missing lookup ${type}:${label}`);
    return lookup.id;
};

const departmentIdsByName = new Map<string, string>();

const ensureDepartment = async (name?: string): Promise<string | null> => {
    if (!name) return null;
    const key = name.toLowerCase();
    const existingId = departmentIdsByName.get(key);
    if (existingId) return existingId;

    const created = await prisma.department.create({
        data: { id: generateNanoId(), name },
    });

    departmentIdsByName.set(key, created.id);
    return created.id;
};

export const seedEmployees = async (adminUserId: string) => {
    seedLog.start('dev:employees', 'Employees and auth accounts');

    const organization = await prisma.organization.findUnique({ where: { slug: 'default' } });
    if (!organization) throw new Error('Default organization not found.');

    for (const seed of employeeSeeds) {
        const [roleId, departmentId] = await Promise.all([
            getLookupId(LookupType.PROFESSIONAL_ROLE, seed.professionalRole),
            ensureDepartment(seed.department),
        ]);

        const createdUser = await auth.api.createUser({
            body: {
                email: seed.email,
                password: seed.password,
                name: seed.name,
                role: seed.authRole,
                data: { id: generateNanoId() },
            },
        });

        if (!createdUser?.user) throw new Error(`Failed to create auth user ${seed.email}`);

        await prisma.$transaction(async (tx) => {
            await tx.member.create({
                data: {
                    id: generateNanoId(),
                    organizationId: organization.id,
                    userId: createdUser.user.id,
                    role: seed.authRole,
                    createdAt: new Date(),
                },
            });

            const employee = await tx.employee.create({
                data: {
                    id: generateNanoId(),
                    name: seed.name,
                    email: seed.email,
                    phoneNumber: seed.phoneNumber,
                    roleId,
                    departmentId,
                    userId: createdUser.user.id,
                },
            });

            await tx.user.update({
                where: { id: createdUser.user.id },
                data: { profile: employee.id },
            });

            await FileService.createEmployeeFolder(tx, employee.id, employee.name, adminUserId);
        });
    }

    seedLog.done('dev:employees', `Created ${employeeSeeds.length} employees`);
};

export const seedVendors = async (adminUserId: string) => {
    seedLog.start('dev:vendors', 'Vendors');

    const rows = await readVendorSeedRows();
    const defaultVendorTypeId = await getLookupId(LookupType.VENDOR_TYPE, 'MATERIAL');
    const rowsByName = new Map<string, (typeof rows)[number]>();

    for (const row of rows) {
        const key = row.name.toLowerCase();
        if (!rowsByName.has(key)) rowsByName.set(key, row);
    }

    for (const row of rowsByName.values()) {
        await prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.create({
                data: {
                    id: generateNanoId(),
                    name: row.name,
                    typeId: row.typeId ?? defaultVendorTypeId,
                    status: row.status,
                    categoryTags: row.categoryTags,
                    taxId: row.taxId,
                    address: row.address,
                    email: row.email,
                    phone: row.phone,
                    website: row.website,
                    fax: row.fax,
                    paymentTerms: row.paymentTerms,
                    notes: row.notes,
                },
            });

            await FileService.createVendorFolder(tx, vendor.id, vendor.name, adminUserId);
        });
    }

    seedLog.done('dev:vendors', `Created ${rowsByName.size} vendors`);
};

export const seedGcs = async (adminUserId: string) => {
    seedLog.start('dev:gcs', 'General contractors and contacts');

    const rows = await readGcSeedRows();
    const defaultGcTypeId = await getLookupId(LookupType.GC_TYPE, 'Private');
    const gcIdsByName = new Map<string, string>();

    for (const row of rows) {
        const key = row.name.toLowerCase();
        if (gcIdsByName.has(key)) continue;

        const gc = await prisma.$transaction(async (tx) => {
            const created = await tx.generalContractor.create({
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

            await FileService.createGcFolder(tx, created.id, created.name, adminUserId);
            return created;
        });

        gcIdsByName.set(key, gc.id);
    }

    let contactCount = 0;
    for (const row of await readGcContactSeedRows()) {
        const generalContractorId = gcIdsByName.get(row.generalContractorName.toLowerCase());
        if (!generalContractorId) continue;

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
            },
        });
        contactCount += 1;
    }

    seedLog.done('dev:gcs', `Created ${gcIdsByName.size} GCs and ${contactCount} contacts`);
};

export const seedProjectWorkbooks = async (adminUserId: string) => {
    seedLog.start('dev:projects', 'Project workbook import');

    const summaries = await seedV2ProjectWorkbooks(adminUserId);
    const totals = summaries.reduce(
        (acc, summary) => ({
            projects: acc.projects + summary.createdProjects,
            rfqs: acc.rfqs + summary.createdRfqs,
            pos: acc.pos + summary.createdPurchaseOrders,
            poLines: acc.poLines + summary.createdPurchaseOrderLineItems,
            invoices: acc.invoices + summary.createdPaidInvoices,
            scos: acc.scos + summary.createdSubChangeOrders,
        }),
        { projects: 0, rfqs: 0, pos: 0, poLines: 0, invoices: 0, scos: 0 }
    );

    seedLog.done('dev:projects', `Imported ${summaries.length} workbooks`);
    seedLog.table('Project import totals', [
        { label: 'Projects', value: totals.projects },
        { label: 'RFQs', value: totals.rfqs },
        { label: 'POs', value: totals.pos },
        { label: 'PO lines', value: totals.poLines },
        { label: 'Paid invoices', value: totals.invoices },
        { label: 'SCOs', value: totals.scos },
    ]);
};

export const seedExtraMockProjects = async (
    adminUserId: string,
    options: ExtraMockGenerationOptions
) => {
    seedLog.start('dev:extra-project-generation', 'Extra mock project generation');

    const resolvedOptions = resolveExtraMockGenerationOptions(options);
    const generated = summarizeExtraMockProjectSeeds(resolvedOptions);
    seedLog.done(
        'dev:extra-project-generation',
        `Prepared mock seed plan for ${generated.projectCount} projects`
    );
    seedLog.table('Prepared mock seed data', [
        { label: 'Projects', value: generated.projectCount },
        { label: 'RFQs', value: generated.rfqCount },
        { label: 'POs', value: generated.purchaseOrderCount },
        { label: 'PO lines', value: generated.purchaseOrderLineItemCount },
        { label: 'Paid invoices', value: generated.paidInvoiceCount },
        { label: 'SCOs', value: generated.subChangeOrderCount },
        { label: 'Min issue date', value: generated.minIssueDate ?? 'n/a' },
        { label: 'Max issue date', value: generated.maxIssueDate ?? 'n/a' },
    ]);

    seedLog.start('dev:extra-projects', 'Extra mock project import');

    const summaries = await seedGeneratedProjectSeeds(adminUserId, {
        count: resolvedOptions.projectCount,
        createSeed: (index) => generateExtraMockProjectSeed(index, resolvedOptions),
        label: 'extra mock project',
        progressEvery: 100,
        concurrency: resolvedOptions.importConcurrency,
    });
    const totals = summaries.reduce(
        (acc, summary) => ({
            projects: acc.projects + summary.createdProjects,
            rfqs: acc.rfqs + summary.createdRfqs,
            pos: acc.pos + summary.createdPurchaseOrders,
            poLines: acc.poLines + summary.createdPurchaseOrderLineItems,
            invoices: acc.invoices + summary.createdPaidInvoices,
            scos: acc.scos + summary.createdSubChangeOrders,
        }),
        { projects: 0, rfqs: 0, pos: 0, poLines: 0, invoices: 0, scos: 0 }
    );

    seedLog.done('dev:extra-projects', `Imported ${summaries.length} extra mock projects`);
    seedLog.table('Extra mock project totals', [
        { label: 'Projects', value: totals.projects },
        { label: 'RFQs', value: totals.rfqs },
        { label: 'POs', value: totals.pos },
        { label: 'PO lines', value: totals.poLines },
        { label: 'Paid invoices', value: totals.invoices },
        { label: 'SCOs', value: totals.scos },
    ]);
};

export const ensureDirectoryEntityFolders = async (adminUserId: string) => {
    seedLog.start('dev:directory-folders', 'Directory entity folder reconciliation');

    const [vendors, gcs, vendorRootFolder, gcRootFolder] = await Promise.all([
        prisma.vendor.findMany({ select: { id: true, name: true } }),
        prisma.generalContractor.findMany({ select: { id: true, name: true } }),
        FileService.getRootFolder('vendor'),
        FileService.getRootFolder('gc'),
    ]);

    const existingFolders = new Set(
        (
            await prisma.file.findMany({
                where: {
                    type: 'FOLDER',
                    deletedAt: null,
                    OR: [
                        {
                            parentId: vendorRootFolder.id,
                            name: { in: vendors.map((vendor) => vendor.id) },
                        },
                        { parentId: gcRootFolder.id, name: { in: gcs.map((gc) => gc.id) } },
                    ],
                },
                select: { parentId: true, name: true },
            })
        ).map((folder) => `${folder.parentId}:${folder.name}`)
    );

    const vendorFoldersToCreate = vendors
        .filter((vendor) => !existingFolders.has(`${vendorRootFolder.id}:${vendor.id}`))
        .map((vendor) => ({
            id: generateNanoId(),
            name: vendor.id,
            displayName: vendor.name,
            type: 'FOLDER' as const,
            createdBy: adminUserId,
            isDeletable: false,
            parentId: vendorRootFolder.id,
        }));

    const gcFoldersToCreate = gcs
        .filter((gc) => !existingFolders.has(`${gcRootFolder.id}:${gc.id}`))
        .map((gc) => ({
            id: generateNanoId(),
            name: gc.id,
            displayName: gc.name,
            type: 'FOLDER' as const,
            createdBy: adminUserId,
            isDeletable: false,
            parentId: gcRootFolder.id,
        }));

    const createFolderBatches = async (folders: typeof vendorFoldersToCreate) => {
        const batchSize = 1000;
        for (let start = 0; start < folders.length; start += batchSize) {
            await prisma.file.createMany({
                data: folders.slice(start, start + batchSize),
            });
        }
    };

    await Promise.all([
        createFolderBatches(vendorFoldersToCreate),
        createFolderBatches(gcFoldersToCreate),
    ]);

    seedLog.done(
        'dev:directory-folders',
        `Created ${vendorFoldersToCreate.length} vendor folders and ${gcFoldersToCreate.length} GC folders`
    );
};

export const verifyRootFolders = async () => {
    await Promise.all([
        FileService.getRootFolder('projects'),
        FileService.getRootFolder('employees'),
        FileService.getRootFolder('gc'),
        FileService.getRootFolder('vendor'),
        FileService.getRootFolder('temp'),
    ]);
};
