import { Invoice, InvoiceAttachment, Prisma } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

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

    getInvoices: async (params: PaginationParams): Promise<{ data: Invoice[]; count: number }> => {
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

        const [count, data] = await prisma.$transaction([
            prisma.invoice.count({ where: whereClause }),
            prisma.invoice.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof Invoice]: sortOrder },
                include: { project: true, vendor: true, purchaseOrder: true },
            }),
        ]);

        return { data, count };
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

        if (purchaseOrderId) {
            const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
            if (!po) throw new NotFoundError('Purchase order not found');
            checkDeletedAt(po);
            if (po.projectId !== projectId) {
                throw new BadRequestError('Purchase order does not belong to the project');
            }
            if (po.vendorId !== vendorId) {
                throw new BadRequestError('Purchase order does not belong to the vendor');
            }
        }

        if (relatedSCOIds.length) {
            const scos = await prisma.subChangeOrder.findMany({
                where: { id: { in: relatedSCOIds } },
            });
            if (scos.length !== relatedSCOIds.length) {
                throw new NotFoundError('One or more related SCOs not found');
            }
            if (scos.some((s) => s.projectId !== projectId)) {
                throw new BadRequestError('Related SCOs must belong to the same project');
            }
        }

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
                    id: ulid(),
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

            const folderId = await FileService.getProjectSubFolderId(projectId, 'INVOICE', tx);
            for (const documentId of attachments) {
                await FileService.moveFileToFolder(documentId, folderId, tx);
                await tx.invoiceAttachment.create({
                    data: { id: ulid(), invoiceId: invoice.id, documentId },
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

        if (purchaseOrderId) {
            const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
            if (!po) throw new NotFoundError('Purchase order not found');
            checkDeletedAt(po);
            if (po.projectId !== projectId) {
                throw new BadRequestError('Purchase order does not belong to the project');
            }
            if (po.vendorId !== vendorId) {
                throw new BadRequestError('Purchase order does not belong to the vendor');
            }
        }

        if (relatedSCOIds.length) {
            const scos = await prisma.subChangeOrder.findMany({
                where: { id: { in: relatedSCOIds } },
            });
            if (scos.length !== relatedSCOIds.length) {
                throw new NotFoundError('One or more related SCOs not found');
            }
            if (scos.some((s) => s.projectId !== projectId)) {
                throw new BadRequestError('Related SCOs must belong to the same project');
            }
        }

        if (invoiceNumber !== existing.invoiceNumber) {
            const duplicate = await prisma.invoice.findUnique({
                where: { invoiceNumber_vendorId: { invoiceNumber, vendorId } },
            });
            if (duplicate) {
                throw new ConflictError('Invoice number already exists for this vendor');
            }
        }

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
                description: `Updated invoice ${updated.invoiceNumber}`,
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
        if (invoice.isPaid) {
            throw new BadRequestError('Cannot modify attachments on a paid invoice');
        }

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getProjectSubFolderId(
                invoice.projectId,
                'INVOICE',
                tx
            );
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.invoiceAttachment.create({
                data: { id: ulid(), invoiceId, documentId },
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
        if (!paymentMethod) throw new NotFoundError('Payment method not found');

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
