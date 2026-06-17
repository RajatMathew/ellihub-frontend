import { Invoice, InvoiceAttachment, Prisma, PurchaseOrder } from '@db/client';
import { AccessContext, projectAssignmentWhereForEmployee } from '@lib/access';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import {
    ActivityLogService,
    activityChange,
    buildUpdateActivityDescription,
} from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { LookupType } from '@modules/lookup/models';
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import {
    AddInvoiceAttachmentRequest,
    DisputeInvoiceRequest,
    InvoiceCreateRequest,
    InvoiceUpdateRequest,
    MarkInvoicePaidRequest,
    MarkInvoiceUnpaidRequest,
    RemoveInvoiceAttachmentRequest,
    ResolveInvoiceDisputeRequest,
} from './models';

function toNumber(value: { toString(): string } | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    const numericValue = Number(value.toString());
    return Number.isFinite(numericValue) ? numericValue : 0;
}

function assertPurchaseOrderCanBeInvoiced(po: PurchaseOrder) {
    if (po.status !== 'ISSUED') {
        throw new BadRequestError('Only issued purchase orders can be invoiced');
    }
}

async function assertRelatedSCOsBelongToPurchaseOrder(
    relatedSCOIds: string[],
    projectId: string,
    purchaseOrderId: string | null | undefined
) {
    if (!relatedSCOIds.length) return;

    if (!purchaseOrderId) {
        throw new BadRequestError('Related SCOs require a purchase order');
    }

    const scos = await prisma.subChangeOrder.findMany({
        where: { id: { in: relatedSCOIds }, deletedAt: null },
    });
    if (scos.length !== relatedSCOIds.length) {
        throw new NotFoundError('One or more related SCOs not found');
    }
    if (scos.some((sco) => sco.projectId !== projectId)) {
        throw new BadRequestError('Related SCOs must belong to the same project');
    }
    if (scos.some((sco) => sco.purchaseOrderId !== purchaseOrderId)) {
        throw new BadRequestError('Related SCOs must belong to the selected purchase order');
    }
}

export const InvoiceService = {
    getInvoicesByPo: async (purchaseOrderId: string) => {
        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);

        return await prisma.invoice.findMany({
            where: { purchaseOrderId, deletedAt: null },
            orderBy: { invoiceDate: 'desc' },
            include: { vendor: true, paymentMethod: true },
        });
    },

    getInvoice: async (id: string) => {
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                project: true,
                vendor: true,
                purchaseOrder: true,
                paymentMethod: true,
                attachments: { include: { document: true } },
            },
        });
        if (!invoice) throw new NotFoundError('Invoice not found');
        checkDeletedAt(invoice);

        const relatedSCOs = invoice.relatedSCOIds.length
            ? await prisma.subChangeOrder.findMany({
                  where: { id: { in: invoice.relatedSCOIds }, deletedAt: null },
                  include: {
                      changeType: true,
                      lineItems: {
                          where: { deletedAt: null },
                          orderBy: { sequenceNumber: 'asc' },
                          include: { unit: true },
                      },
                      attachments: { include: { document: true } },
                  },
              })
            : [];

        return { ...invoice, relatedSCOs };
    },

    getInvoices: async (
        params: PaginationParams,
        access?: AccessContext
    ): Promise<{ data: Invoice[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { projectId, vendorId, purchaseOrderId, isPaid, ...restFilter } = filter || {};

        const whereClause: Prisma.InvoiceWhereInput = {
            deletedAt: null,
            ...restFilter,
            ...(projectId && { projectId }),
            ...(vendorId && { vendorId }),
            ...(purchaseOrderId && { purchaseOrderId }),
            ...(isPaid !== undefined && { isPaid: isPaid === 'true' || isPaid === true }),
            ...(search && {
                OR: [{ invoiceNumber: { contains: search, mode: 'insensitive' as const } }],
            }),
        };
        const scopedWhereClause: Prisma.InvoiceWhereInput =
            access && access.projectScope !== 'all'
                ? {
                      AND: [
                          whereClause,
                          access.employeeId
                              ? {
                                    project: {
                                        ...projectAssignmentWhereForEmployee(access.employeeId),
                                    },
                                }
                              : { id: { in: [] } },
                      ],
                  }
                : whereClause;

        const [count, data] = await prisma.$transaction([
            prisma.invoice.count({ where: scopedWhereClause }),
            prisma.invoice.findMany({
                where: scopedWhereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof Invoice]: sortOrder },
                include: { project: true, vendor: true, purchaseOrder: true },
            }),
        ]);

        return { data, count };
    },

    getStats: async (projectId: string, access?: AccessContext) => {
        const whereClause: Prisma.InvoiceWhereInput = {
            deletedAt: null,
            projectId,
        };
        const scopedWhereClause: Prisma.InvoiceWhereInput =
            access && access.projectScope !== 'all'
                ? {
                      AND: [
                          whereClause,
                          access.employeeId
                              ? {
                                    project: {
                                        ...projectAssignmentWhereForEmployee(access.employeeId),
                                    },
                                }
                              : { id: { in: [] } },
                      ],
                  }
                : whereClause;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [
            totalInvoices,
            paidInvoices,
            unpaidInvoices,
            disputedInvoices,
            overdueInvoices,
            totalAggregate,
            paidAggregate,
            unpaidAggregate,
        ] = await prisma.$transaction([
            prisma.invoice.count({ where: scopedWhereClause }),
            prisma.invoice.count({ where: { ...scopedWhereClause, isPaid: true } }),
            prisma.invoice.count({ where: { ...scopedWhereClause, isPaid: false } }),
            prisma.invoice.count({ where: { ...scopedWhereClause, isDisputed: true } }),
            prisma.invoice.count({
                where: {
                    ...scopedWhereClause,
                    isPaid: false,
                    dueDate: { lt: today },
                },
            }),
            prisma.invoice.aggregate({
                where: scopedWhereClause,
                _sum: { totalAmount: true },
            }),
            prisma.invoice.aggregate({
                where: { ...scopedWhereClause, isPaid: true },
                _sum: { totalAmount: true },
            }),
            prisma.invoice.aggregate({
                where: { ...scopedWhereClause, isPaid: false },
                _sum: { totalAmount: true },
            }),
        ]);

        return {
            totalInvoices,
            paidInvoices,
            unpaidInvoices,
            disputedInvoices,
            overdueInvoices,
            totalAmount: toNumber(totalAggregate._sum.totalAmount),
            paidAmount: toNumber(paidAggregate._sum.totalAmount),
            unpaidAmount: toNumber(unpaidAggregate._sum.totalAmount),
        };
    },

    createInvoice: async (request: InvoiceCreateRequest, userId: string): Promise<Invoice> => {
        const {
            projectId,
            vendorId,
            purchaseOrderId,
            invoiceNumber,
            invoiceDate,
            dueDate,
            totalAmount,
            taxAmount,
            taxRate,
            notes,
            relatedSCOIds,
            attachments,
        } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        let purchaseOrder: PurchaseOrder | null = null;
        if (purchaseOrderId) {
            purchaseOrder = await prisma.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
            });
            if (!purchaseOrder) throw new NotFoundError('Purchase order not found');
            checkDeletedAt(purchaseOrder);
            assertPurchaseOrderCanBeInvoiced(purchaseOrder);
            if (purchaseOrder.projectId !== projectId) {
                throw new BadRequestError('Purchase order does not belong to the project');
            }
            if (purchaseOrder.vendorId !== vendorId) {
                throw new BadRequestError('Purchase order does not belong to the vendor');
            }
        }

        await assertRelatedSCOsBelongToPurchaseOrder(relatedSCOIds, projectId, purchaseOrderId);

        const files = await prisma.file.findMany({ where: { id: { in: attachments } } });
        if (files.length !== attachments.length) {
            throw new NotFoundError('One or more attachment files not found');
        }

        const duplicate = await prisma.invoice.findUnique({
            where: { invoiceNumber_vendorId: { invoiceNumber, vendorId } },
        });
        if (duplicate) {
            throw new ConflictError('Invoice number already exists for this vendor');
        }

        return await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    id: generateNanoId(),
                    projectId,
                    vendorId,
                    purchaseOrderId: purchaseOrderId ?? null,
                    invoiceNumber,
                    invoiceDate: new Date(invoiceDate),
                    dueDate: new Date(dueDate),
                    totalAmount: new Prisma.Decimal(totalAmount),
                    taxAmount: taxAmount != null ? new Prisma.Decimal(taxAmount) : null,
                    taxRate: taxRate != null ? new Prisma.Decimal(taxRate) : null,
                    notes: notes ?? null,
                    relatedSCOIds,
                },
            });

            const folderId = await FileService.getOrCreateProjectEntityFolder(
                { projectId, entityType: 'INVOICE', entityId: invoice.id },
                userId,
                tx
            );
            for (const documentId of attachments) {
                await FileService.moveFileToFolder(documentId, folderId, tx);
                await tx.invoiceAttachment.create({
                    data: { id: generateNanoId(), invoiceId: invoice.id, documentId },
                });
            }

            await ActivityLogService.log({
                userId,
                entityType: 'invoice',
                entityId: invoice.id,
                action: 'create',
                description: `Created invoice ${invoice.invoiceNumber} for vendor ${vendor.name}`,
                affectedEntityIds: [
                    projectId,
                    vendorId,
                    ...(purchaseOrderId ? [purchaseOrderId] : []),
                    ...relatedSCOIds,
                    ...attachments,
                ],
                tx,
            });

            return invoice;
        });
    },

    updateInvoice: async (request: InvoiceUpdateRequest, userId: string): Promise<Invoice> => {
        const {
            id,
            projectId,
            vendorId,
            purchaseOrderId,
            invoiceNumber,
            invoiceDate,
            dueDate,
            totalAmount,
            taxAmount,
            taxRate,
            notes,
            relatedSCOIds,
        } = request;

        const existing = await prisma.invoice.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Invoice not found');
        checkDeletedAt(existing);
        if (existing.isPaid) {
            throw new BadRequestError('Paid invoices cannot be updated');
        }
        if (existing.projectId !== projectId) {
            throw new BadRequestError('Invoice project cannot be changed');
        }
        if (existing.vendorId !== vendorId) {
            throw new BadRequestError('Invoice vendor cannot be changed');
        }

        let purchaseOrder: PurchaseOrder | null = null;
        if (purchaseOrderId) {
            purchaseOrder = await prisma.purchaseOrder.findUnique({
                where: { id: purchaseOrderId },
            });
            if (!purchaseOrder) throw new NotFoundError('Purchase order not found');
            checkDeletedAt(purchaseOrder);
            assertPurchaseOrderCanBeInvoiced(purchaseOrder);
            if (purchaseOrder.projectId !== projectId) {
                throw new BadRequestError('Purchase order does not belong to the project');
            }
            if (purchaseOrder.vendorId !== vendorId) {
                throw new BadRequestError('Purchase order does not belong to the vendor');
            }
        }

        await assertRelatedSCOsBelongToPurchaseOrder(relatedSCOIds, projectId, purchaseOrderId);

        if (invoiceNumber !== existing.invoiceNumber) {
            const duplicate = await prisma.invoice.findUnique({
                where: { invoiceNumber_vendorId: { invoiceNumber, vendorId } },
            });
            if (duplicate) {
                throw new ConflictError('Invoice number already exists for this vendor');
            }
        }

        const [currentPurchaseOrder, relatedScos] = await Promise.all([
            existing.purchaseOrderId
                ? prisma.purchaseOrder.findUnique({
                      where: { id: existing.purchaseOrderId },
                      select: { id: true, poNumber: true },
                  })
                : null,
            relatedSCOIds.length || existing.relatedSCOIds.length
                ? prisma.subChangeOrder.findMany({
                      where: {
                          id: { in: [...new Set([...relatedSCOIds, ...existing.relatedSCOIds])] },
                      },
                      select: { id: true, scoNumber: true },
                  })
                : [],
        ]);
        const scoNumberById = new Map(relatedScos.map((sco) => [sco.id, sco.scoNumber]));
        const formatScoSelection = (value: unknown) =>
            Array.isArray(value)
                ? value.map((id) => scoNumberById.get(String(id)) ?? String(id)).join(', ') ||
                  'none'
                : String(value ?? 'none');

        return await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, { entityType: 'INVOICE', entityId: id, userId });

            const updated = await tx.invoice.update({
                where: { id },
                data: {
                    purchaseOrderId: purchaseOrderId ?? null,
                    invoiceNumber,
                    invoiceDate: new Date(invoiceDate),
                    dueDate: new Date(dueDate),
                    totalAmount: new Prisma.Decimal(totalAmount),
                    taxAmount: taxAmount != null ? new Prisma.Decimal(taxAmount) : null,
                    taxRate: taxRate != null ? new Prisma.Decimal(taxRate) : null,
                    notes: notes ?? null,
                    relatedSCOIds,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'invoice',
                entityId: id,
                action: 'update',
                description: buildUpdateActivityDescription(`invoice ${updated.invoiceNumber}`, [
                    activityChange('Invoice number', existing.invoiceNumber, updated.invoiceNumber),
                    activityChange(
                        'Purchase order',
                        currentPurchaseOrder?.poNumber,
                        purchaseOrder?.poNumber
                    ),
                    activityChange('Invoice date', existing.invoiceDate, updated.invoiceDate),
                    activityChange('Due date', existing.dueDate, updated.dueDate),
                    activityChange('Total amount', existing.totalAmount, updated.totalAmount),
                    activityChange('Tax amount', existing.taxAmount, updated.taxAmount),
                    activityChange('Tax rate', existing.taxRate, updated.taxRate),
                    activityChange('Notes', existing.notes, updated.notes),
                    activityChange(
                        'Related SCOs',
                        existing.relatedSCOIds,
                        updated.relatedSCOIds,
                        formatScoSelection
                    ),
                ]),
                affectedEntityIds: [
                    projectId,
                    vendorId,
                    ...(purchaseOrderId ? [purchaseOrderId] : []),
                ],
                tx,
            });

            return updated;
        });
    },

    addAttachment: async (
        request: AddInvoiceAttachmentRequest,
        userId: string
    ): Promise<InvoiceAttachment> => {
        const { invoiceId, documentId } = request;

        const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) throw new NotFoundError('Invoice not found');
        checkDeletedAt(invoice);

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getOrCreateProjectEntityFolder(
                { projectId: invoice.projectId, entityType: 'INVOICE', entityId: invoice.id },
                userId,
                tx
            );
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.invoiceAttachment.create({
                data: { id: generateNanoId(), invoiceId, documentId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'invoice',
                entityId: invoiceId,
                action: 'link',
                description: `Attached file ${file.name} to invoice ${invoice.invoiceNumber}`,
                affectedEntityIds: [documentId, invoice.projectId, invoice.vendorId],
                tx,
            });

            return attachment;
        });
    },

    removeAttachment: async (
        request: RemoveInvoiceAttachmentRequest,
        userId: string
    ): Promise<void> => {
        const { id } = request;

        const attachment = await prisma.invoiceAttachment.findUnique({
            where: { id },
            include: { invoice: true, document: true },
        });
        if (!attachment) throw new NotFoundError('Attachment not found');
        checkDeletedAt(attachment.invoice);
        if (attachment.invoice.isPaid) {
            throw new BadRequestError('Cannot modify attachments on a paid invoice');
        }

        const remaining = await prisma.invoiceAttachment.count({
            where: { invoiceId: attachment.invoiceId },
        });
        if (remaining <= 1) {
            throw new BadRequestError('Invoice must have at least one attachment');
        }

        await prisma.invoiceAttachment.delete({ where: { id } });

        await ActivityLogService.log({
            userId,
            entityType: 'invoice',
            entityId: attachment.invoiceId,
            action: 'unlink',
            description: `Removed attachment ${attachment.document.name} from invoice ${attachment.invoice.invoiceNumber}`,
            affectedEntityIds: [
                attachment.documentId,
                attachment.invoice.projectId,
                attachment.invoice.vendorId,
            ],
        });
    },

    markPaid: async (request: MarkInvoicePaidRequest, userId: string): Promise<Invoice> => {
        const { id, paidDate, paymentMethodId, paymentReference, paymentNotes } = request;

        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundError('Invoice not found');
        checkDeletedAt(invoice);
        if (invoice.isPaid) {
            throw new BadRequestError('Invoice is already paid');
        }
        if (invoice.isDisputed) {
            throw new BadRequestError('Disputed invoice cannot be marked as paid');
        }

        const paymentMethod = await prisma.lookup.findUnique({ where: { id: paymentMethodId } });
        if (!paymentMethod || paymentMethod.type !== LookupType.PAYMENT_METHOD) {
            throw new NotFoundError('Payment method not found');
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                isPaid: true,
                paidDate: new Date(paidDate),
                paymentMethodId,
                paymentReference: paymentReference ?? null,
                paymentNotes: paymentNotes ?? null,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'invoice',
            entityId: id,
            action: 'update',
            description: `Marked invoice ${updated.invoiceNumber} as paid`,
            affectedEntityIds: [invoice.projectId, invoice.vendorId],
        });

        return updated;
    },

    markUnpaid: async (request: MarkInvoiceUnpaidRequest, userId: string): Promise<Invoice> => {
        const { id } = request;

        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundError('Invoice not found');
        checkDeletedAt(invoice);
        if (!invoice.isPaid) {
            throw new BadRequestError('Invoice is not paid');
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                isPaid: false,
                paidDate: null,
                paymentMethodId: null,
                paymentReference: null,
                paymentNotes: null,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'invoice',
            entityId: id,
            action: 'update',
            description: `Reverted invoice ${updated.invoiceNumber} to unpaid`,
            affectedEntityIds: [invoice.projectId, invoice.vendorId],
        });

        return updated;
    },

    disputeInvoice: async (request: DisputeInvoiceRequest, userId: string): Promise<Invoice> => {
        const { id, disputeReason } = request;

        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundError('Invoice not found');
        checkDeletedAt(invoice);
        if (invoice.isDisputed) {
            throw new BadRequestError('Invoice is already disputed');
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                isDisputed: true,
                disputeReason,
                disputedAt: new Date(),
                resolvedAt: null,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'invoice',
            entityId: id,
            action: 'update',
            description: `Disputed invoice ${updated.invoiceNumber}`,
            affectedEntityIds: [invoice.projectId, invoice.vendorId],
        });

        return updated;
    },

    resolveDispute: async (
        request: ResolveInvoiceDisputeRequest,
        userId: string
    ): Promise<Invoice> => {
        const { id } = request;

        const invoice = await prisma.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundError('Invoice not found');
        checkDeletedAt(invoice);
        if (!invoice.isDisputed) {
            throw new BadRequestError('Invoice is not disputed');
        }

        const updated = await prisma.invoice.update({
            where: { id },
            data: {
                isDisputed: false,
                resolvedAt: new Date(),
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'invoice',
            entityId: id,
            action: 'update',
            description: `Resolved dispute on invoice ${updated.invoiceNumber}`,
            affectedEntityIds: [invoice.projectId, invoice.vendorId],
        });

        return updated;
    },
};
