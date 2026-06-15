import { Prisma, Vendor, VendorDocument } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import {
    ActivityLogService,
    activityChange,
    buildUpdateActivityDescription,
    formatEnumActivityValue,
} from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddVendorDocumentRequest,
    RemoveVendorDocumentRequest,
    UpdateVendorDocumentRequest,
    VendorCreateRequest,
    VendorUpdateRequest,
} from './models';

const vendorListInclude = {
    type: true,
    contacts: true,
    _count: {
        select: {
            contacts: true,
            documents: true,
            purchaseOrders: true,
            invoices: true,
        },
    },
} satisfies Prisma.VendorInclude;

const vendorDetailInclude = {
    type: true,
    contacts: true,
    documents: {
        include: {
            file: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    },
    _count: {
        select: {
            contacts: true,
            documents: true,
            purchaseOrders: true,
            invoices: true,
        },
    },
} satisfies Prisma.VendorInclude;

type VendorFinancialMetrics = {
    totalCommitted: number;
    totalPaid: number;
    outstandingBalance: number;
    currentBalance: number;
    purchaseOrderCount: number;
    invoiceCount: number;
    documentCount: number;
};

type VendorListItem = Prisma.VendorGetPayload<{ include: typeof vendorListInclude }> &
    VendorFinancialMetrics;
type VendorDetail = Prisma.VendorGetPayload<{ include: typeof vendorDetailInclude }> &
    VendorFinancialMetrics;
type VendorStats = Pick<
    VendorFinancialMetrics,
    'totalCommitted' | 'totalPaid' | 'outstandingBalance' | 'currentBalance'
> & {
    totalVendors: number;
};

type VendorArchiveBlockCounts = {
    purchaseOrders: number;
    rfqs: number;
    subChangeOrders: number;
};

const emptyVendorMetrics: VendorFinancialMetrics = {
    totalCommitted: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    currentBalance: 0,
    purchaseOrderCount: 0,
    invoiceCount: 0,
    documentCount: 0,
};

const optionalNullableChanged = <T>(next: T | null | undefined, current: T | null) =>
    next !== undefined && (next ?? null) !== current;

const stringArraysEqual = (first: string[], second: string[]) =>
    first.length === second.length && first.every((value, index) => value === second[index]);

const hasVendorProfileChanged = (vendor: Vendor, request: VendorUpdateRequest) =>
    request.name !== vendor.name ||
    (request.typeId ?? null) !== vendor.typeId ||
    request.status !== vendor.status ||
    optionalNullableChanged(request.email, vendor.email) ||
    request.paymentTerms !== vendor.paymentTerms ||
    optionalNullableChanged(request.taxId, vendor.taxId) ||
    optionalNullableChanged(request.address, vendor.address) ||
    optionalNullableChanged(request.phone, vendor.phone) ||
    optionalNullableChanged(request.website, vendor.website) ||
    optionalNullableChanged(request.fax, vendor.fax) ||
    optionalNullableChanged(request.notes, vendor.notes) ||
    (request.categoryTags !== undefined &&
        !stringArraysEqual(request.categoryTags, vendor.categoryTags));

const getGroupedCount = (count: unknown): number => {
    if (typeof count === 'number') return count;
    if (!count || typeof count !== 'object' || !('_all' in count)) return 0;

    return Number((count as { _all?: number })._all ?? 0);
};

function formatCount(count: number, singular: string, plural = `${singular}s`) {
    if (count === 0) return null;
    return `${count} ${count === 1 ? singular : plural}`;
}

function joinHumanList(items: string[]) {
    if (items.length <= 1) return items[0] ?? '';
    if (items.length === 2) return `${items[0]} and ${items[1]}`;
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function buildVendorArchiveBlockedMessage(vendorName: string, counts: VendorArchiveBlockCounts) {
    const blockers = [
        formatCount(counts.purchaseOrders, 'purchase order'),
        formatCount(counts.rfqs, 'RFQ', 'RFQs'),
        formatCount(counts.subChangeOrders, 'sub change order'),
    ].filter((blocker): blocker is string => Boolean(blocker));

    return `Cannot archive vendor ${vendorName} because it is linked to ${joinHumanList(
        blockers
    )}. Remove those links before archiving this vendor.`;
}

async function getVendorArchiveBlockCounts(vendorId: string): Promise<VendorArchiveBlockCounts> {
    const [purchaseOrders, rfqs, subChangeOrders] = await prisma.$transaction([
        prisma.purchaseOrder.count({
            where: { vendorId, deletedAt: null },
        }),
        prisma.rFQ.count({
            where: {
                deletedAt: null,
                OR: [{ awardedVendorId: vendorId }, { vendorQuotes: { some: { vendorId } } }],
            },
        }),
        prisma.subChangeOrder.count({
            where: {
                deletedAt: null,
                purchaseOrder: { vendorId, deletedAt: null },
            },
        }),
    ]);

    return { purchaseOrders, rfqs, subChangeOrders };
}

async function assertVendorCanBeArchived(vendorId: string, vendorName: string) {
    const counts = await getVendorArchiveBlockCounts(vendorId);
    if (counts.purchaseOrders === 0 && counts.rfqs === 0 && counts.subChangeOrders === 0) {
        return;
    }

    throw new ConflictError(buildVendorArchiveBlockedMessage(vendorName, counts));
}

const getVendorFinancialMetricsById = async (
    vendorIds: string[]
): Promise<Map<string, VendorFinancialMetrics>> => {
    if (vendorIds.length === 0) return new Map();

    const [purchaseOrderTotals, paidInvoiceTotals, outstandingInvoiceTotals, invoiceCounts] =
        await prisma.$transaction([
            prisma.purchaseOrder.groupBy({
                by: ['vendorId'],
                orderBy: { vendorId: 'asc' },
                where: {
                    vendorId: { in: vendorIds },
                    deletedAt: null,
                    status: { not: 'CANCELLED' },
                },
                _count: { _all: true },
                _sum: { total: true },
            }),
            prisma.invoice.groupBy({
                by: ['vendorId'],
                orderBy: { vendorId: 'asc' },
                where: {
                    vendorId: { in: vendorIds },
                    deletedAt: null,
                    isPaid: true,
                },
                _sum: { totalAmount: true },
            }),
            prisma.invoice.groupBy({
                by: ['vendorId'],
                orderBy: { vendorId: 'asc' },
                where: {
                    vendorId: { in: vendorIds },
                    deletedAt: null,
                    isPaid: false,
                },
                _sum: { totalAmount: true },
            }),
            prisma.invoice.groupBy({
                by: ['vendorId'],
                orderBy: { vendorId: 'asc' },
                where: {
                    vendorId: { in: vendorIds },
                    deletedAt: null,
                },
                _count: { _all: true },
            }),
        ]);

    const metricsByVendorId = new Map<string, VendorFinancialMetrics>();

    for (const vendorId of vendorIds) {
        const purchaseOrderTotal = purchaseOrderTotals.find((row) => row.vendorId === vendorId);
        const paidInvoiceTotal = paidInvoiceTotals.find((row) => row.vendorId === vendorId);
        const outstandingInvoiceTotal = outstandingInvoiceTotals.find(
            (row) => row.vendorId === vendorId
        );
        const invoiceCount = invoiceCounts.find((row) => row.vendorId === vendorId);

        const totalCommitted = Number(purchaseOrderTotal?._sum?.total ?? 0);
        const totalPaid = Number(paidInvoiceTotal?._sum?.totalAmount ?? 0);
        const outstandingBalance = Number(outstandingInvoiceTotal?._sum?.totalAmount ?? 0);

        metricsByVendorId.set(vendorId, {
            totalCommitted,
            totalPaid,
            outstandingBalance,
            currentBalance: totalCommitted - totalPaid,
            purchaseOrderCount: getGroupedCount(purchaseOrderTotal?._count),
            invoiceCount: getGroupedCount(invoiceCount?._count),
            documentCount: 0,
        });
    }

    return metricsByVendorId;
};

const withVendorMetrics = async <T extends { id: string; _count?: { documents?: number } }>(
    vendors: T[]
): Promise<(T & VendorFinancialMetrics)[]> => {
    const metricsByVendorId = await getVendorFinancialMetricsById(
        vendors.map((vendor) => vendor.id)
    );

    return vendors.map((vendor) => {
        const metrics = metricsByVendorId.get(vendor.id) ?? emptyVendorMetrics;

        return {
            ...vendor,
            ...metrics,
            documentCount: vendor._count?.documents ?? metrics.documentCount,
        };
    });
};

export const VendorService = {
    createVendor: async (request: VendorCreateRequest, userId: string): Promise<Vendor> => {
        const { typeId, ...rest } = request;

        const type = typeId ? await prisma.lookup.findUnique({ where: { id: typeId } }) : null;
        if (typeId && !type) throw new NotFoundError('Vendor type not found');

        return await prisma.$transaction(async (tx) => {
            const vendor = await tx.vendor.create({
                data: { ...rest, id: generateNanoId(), typeId: typeId ?? null },
            });

            await FileService.createVendorFolder(tx, vendor.id, request.name, userId);

            await ActivityLogService.log({
                userId,
                entityType: 'vendor',
                entityId: vendor.id,
                action: 'create',
                description: `Created vendor ${vendor.name}`,
                tx,
            });

            return vendor;
        });
    },

    getVendor: async (id: string): Promise<VendorDetail> => {
        const vendor = await prisma.vendor.findUnique({
            where: { id },
            include: vendorDetailInclude,
        });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        const [vendorWithMetrics] = await withVendorMetrics([vendor]);
        return vendorWithMetrics;
    },

    getStats: async (): Promise<VendorStats> => {
        const vendorWhere = { deletedAt: null } satisfies Prisma.VendorWhereInput;
        const activePurchaseOrderWhere = {
            deletedAt: null,
            status: { not: 'CANCELLED' },
            vendor: vendorWhere,
        } satisfies Prisma.PurchaseOrderWhereInput;
        const invoiceWhere = {
            deletedAt: null,
            vendor: vendorWhere,
        } satisfies Prisma.InvoiceWhereInput;

        const [totalVendors, committed, paid, outstanding] = await prisma.$transaction([
            prisma.vendor.count({ where: vendorWhere }),
            prisma.purchaseOrder.aggregate({
                where: activePurchaseOrderWhere,
                _sum: { total: true },
            }),
            prisma.invoice.aggregate({
                where: { ...invoiceWhere, isPaid: true },
                _sum: { totalAmount: true },
            }),
            prisma.invoice.aggregate({
                where: { ...invoiceWhere, isPaid: false },
                _sum: { totalAmount: true },
            }),
        ]);

        const totalCommitted = Number(committed._sum.total ?? 0);
        const totalPaid = Number(paid._sum.totalAmount ?? 0);

        return {
            totalVendors,
            totalCommitted,
            totalPaid,
            outstandingBalance: Number(outstanding._sum.totalAmount ?? 0),
            currentBalance: totalCommitted - totalPaid,
        };
    },

    updateVendor: async (request: VendorUpdateRequest, userId: string): Promise<Vendor> => {
        const { id, typeId, ...rest } = request;

        const vendor = await prisma.vendor.findUnique({ where: { id } });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);

        const [type, currentType] = await Promise.all([
            typeId ? prisma.lookup.findUnique({ where: { id: typeId } }) : null,
            vendor.typeId ? prisma.lookup.findUnique({ where: { id: vendor.typeId } }) : null,
        ]);
        if (typeId && !type) throw new NotFoundError('Vendor type not found');

        const profileChanged = hasVendorProfileChanged(vendor, request);

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.vendor.update({
                where: { id },
                data: { ...rest, typeId: typeId ?? null },
            });

            if (request.name !== vendor.name) {
                const folderId = await FileService.getVendorFolderId(id, tx);
                await FileService.updateFolderDisplayName(folderId, request.name, tx);
            }

            if (profileChanged) {
                await ActivityLogService.log({
                    userId,
                    entityType: 'vendor',
                    entityId: updated.id,
                    action: 'update',
                    description: buildUpdateActivityDescription(`vendor ${updated.name}`, [
                        activityChange('Name', vendor.name, updated.name),
                        activityChange('Type', currentType?.label, type?.label),
                        activityChange(
                            'Status',
                            vendor.status,
                            updated.status,
                            formatEnumActivityValue
                        ),
                        activityChange('Category tags', vendor.categoryTags, updated.categoryTags),
                        activityChange('Tax ID', vendor.taxId, updated.taxId),
                        activityChange('Address', vendor.address, updated.address),
                        activityChange('Email', vendor.email, updated.email),
                        activityChange('Phone', vendor.phone, updated.phone),
                        activityChange('Website', vendor.website, updated.website),
                        activityChange('Fax', vendor.fax, updated.fax),
                        activityChange(
                            'Payment terms',
                            vendor.paymentTerms,
                            updated.paymentTerms,
                            formatEnumActivityValue
                        ),
                        activityChange('Notes', vendor.notes, updated.notes),
                    ]),
                    tx,
                });
            }

            return updated;
        });
    },

    deleteVendor: async (id: string, userId: string): Promise<void> => {
        const vendor = await prisma.vendor.findUnique({ where: { id } });

        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }

        checkDeletedAt(vendor);
        await assertVendorCanBeArchived(id, vendor.name);

        const affectedContacts = await prisma.contact.findMany({
            where: { vendorId: id },
            select: { id: true },
        });

        await prisma.$transaction([
            prisma.contact.updateMany({
                where: { vendorId: id },
                data: { vendorId: null, isPrimary: false },
            }),
            prisma.vendor.update({
                where: { id },
                data: { deletedAt: new Date() },
            }),
        ]);

        await ActivityLogService.log({
            userId,
            entityType: 'vendor',
            entityId: id,
            action: 'delete',
            description: `Deleted vendor ${vendor.name}`,
            affectedEntityIds: affectedContacts.map((c) => c.id),
        });
    },

    addDocumentToVendor: async (
        request: AddVendorDocumentRequest,
        userId: string
    ): Promise<VendorDocument> => {
        const { vendorId, fileId, expiresOn } = request;

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) {
            throw new NotFoundError('Vendor not found');
        }
        checkDeletedAt(vendor);

        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) {
            throw new NotFoundError('File not found');
        }
        checkDeletedAt(file);

        const existing = await prisma.vendorDocument.findUnique({
            where: { vendorId_fileId: { vendorId, fileId } },
        });
        if (existing) {
            throw new ConflictError('Document already linked to this vendor');
        }

        return await prisma.$transaction(async (tx) => {
            const vendorFolderId = await FileService.getVendorFolderId(vendorId, tx);
            await FileService.moveFileToFolder(fileId, vendorFolderId, tx);

            const doc = await tx.vendorDocument.create({
                data: {
                    id: generateNanoId(),
                    vendorId,
                    fileId,
                    expiresOn: expiresOn ? new Date(expiresOn) : null,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'vendor',
                entityId: vendorId,
                action: 'link',
                description: `Linked document ${file.name} to vendor ${vendor.name}`,
                affectedEntityIds: [fileId],
                tx,
            });

            return doc;
        });
    },

    updateVendorDocument: async (
        request: UpdateVendorDocumentRequest,
        userId: string
    ): Promise<VendorDocument> => {
        const { vendorId, fileId, expiresOn } = request;

        const document = await prisma.vendorDocument.findUnique({
            where: { vendorId_fileId: { vendorId, fileId } },
            include: { file: true, vendor: true },
        });
        if (!document) {
            throw new NotFoundError('Vendor document not found');
        }

        const updated = await prisma.vendorDocument.update({
            where: { id: document.id },
            data: { expiresOn: expiresOn ? new Date(expiresOn) : null },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'vendor',
            entityId: vendorId,
            action: 'update',
            description: buildUpdateActivityDescription(`vendor document ${document.file.name}`, [
                activityChange('Expiration date', document.expiresOn, updated.expiresOn),
            ]),
            affectedEntityIds: [fileId],
        });

        return updated;
    },

    removeDocumentFromVendor: async (
        request: RemoveVendorDocumentRequest,
        userId: string
    ): Promise<void> => {
        const { vendorId, fileId } = request;

        const document = await prisma.vendorDocument.findUnique({
            where: { vendorId_fileId: { vendorId, fileId } },
            include: { file: true, vendor: true },
        });
        if (!document) {
            throw new NotFoundError('Vendor document not found');
        }

        await prisma.vendorDocument.delete({ where: { id: document.id } });

        await ActivityLogService.log({
            userId,
            entityType: 'vendor',
            entityId: vendorId,
            action: 'unlink',
            description: `Unlinked document ${document.file.name} from vendor ${document.vendor.name}`,
            affectedEntityIds: [fileId],
        });
    },

    getVendors: async (
        params: PaginationParams
    ): Promise<{
        data: VendorListItem[];
        count: number;
    }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { typeId, status, excludeIds, ...restFilter } = filter || {};
        const excludedVendorIds =
            typeof excludeIds === 'string'
                ? excludeIds
                      .split(',')
                      .map((id) => id.trim())
                      .filter(Boolean)
                : Array.isArray(excludeIds)
                  ? excludeIds.filter((id): id is string => typeof id === 'string' && !!id.trim())
                  : [];

        const whereClause = {
            deletedAt: null,
            ...restFilter,
            ...(excludedVendorIds.length > 0 && { id: { notIn: excludedVendorIds } }),
            ...(typeId && { typeId }),
            ...(status && { status }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { email: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search, mode: 'insensitive' as const } },
                    { website: { contains: search, mode: 'insensitive' as const } },
                    { address: { contains: search, mode: 'insensitive' as const } },
                    { fax: { contains: search, mode: 'insensitive' as const } },
                    { taxId: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.vendor.count({
                where: whereClause,
            }),

            prisma.vendor.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: {
                    [sortBy as keyof Vendor]: sortOrder,
                },
                include: vendorListInclude,
            }),
        ]);

        return { data: await withVendorMetrics(data), count };
    },
};
