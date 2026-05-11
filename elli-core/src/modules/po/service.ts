import { POAttachment, Prisma, PurchaseOrder, PurchaseOrderQuickBooksPayment } from '@db/client';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { QuickBooksTransactionPreview } from '@modules/integrations/models';
import { QuickBooksService } from '@modules/integrations/service';
import { RevisionService } from '@modules/revision';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddPoQuickBooksPaymentRequest,
    AddPoQuickBooksPaymentsRequest,
    AddPoAttachmentRequest,
    QUICKBOOKS_PO_PAYMENT_ENTITIES,
    PoCreateRequest,
    PoUpdateRequest,
    RemovePoAttachmentRequest,
    SetPoCancelledRequest,
    SetPoDeliveredRequest,
    SetPoDraftRequest,
    SetPoIssuedRequest,
} from './models';
import { generatePoNumber } from './utils';

type PurchaseOrderQuickBooksPaymentResponse = {
    id: string;
    purchaseOrderId: string;
    realmId: string;
    entity: string;
    transactionId: string;
    docNumber: string | null;
    displayName: string;
    txnDate: string | null;
    totalAmount: string | null;
    currency: string | null;
    privateNote: string | null;
    lastUpdatedTime: string | null;
    linkedById: string | null;
    removedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type QuickBooksPaymentOption = QuickBooksTransactionPreview & {
    realmId: string;
    linkedPurchaseOrder: { id: string; poNumber: string | null } | null;
};

type QuickBooksPaymentOptionsResponse = {
    realmId: string;
    companyName: string | null;
    environment: 'sandbox' | 'production';
    fetchedAt: string;
    transactions: QuickBooksPaymentOption[];
};

type PaymentWithPurchaseOrder = PurchaseOrderQuickBooksPayment & {
    purchaseOrder?: Pick<PurchaseOrder, 'id' | 'poNumber'>;
};

const toIsoOrNull = (date: Date | null): string | null => date?.toISOString() ?? null;

const toDateOrNull = (value: string | null): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getQuickBooksPaymentKey = (realmId: string, entity: string, transactionId: string): string =>
    `${realmId}:${entity}:${transactionId}`;

const toQuickBooksPaymentResponse = (
    payment: PurchaseOrderQuickBooksPayment
): PurchaseOrderQuickBooksPaymentResponse => ({
    id: payment.id,
    purchaseOrderId: payment.purchaseOrderId,
    realmId: payment.realmId,
    entity: payment.quickBooksEntity,
    transactionId: payment.quickBooksTransactionId,
    docNumber: payment.docNumber,
    displayName: payment.displayName,
    txnDate: toIsoOrNull(payment.txnDate),
    totalAmount: payment.totalAmount?.toString() ?? null,
    currency: payment.currency,
    privateNote: payment.privateNote,
    lastUpdatedTime: toIsoOrNull(payment.lastUpdatedTime),
    linkedById: payment.linkedById,
    removedAt: toIsoOrNull(payment.removedAt),
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
});

const assertPurchaseOrderExists = async (id: string): Promise<PurchaseOrder> => {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundError('Purchase order not found');
    checkDeletedAt(po);
    return po;
};

type ResolvedQuickBooksPayment = {
    realmId: string;
    transaction: QuickBooksTransactionPreview;
};

const resolveQuickBooksPayment = async (
    request: AddPoQuickBooksPaymentRequest
): Promise<ResolvedQuickBooksPayment> => {
    const transactionResponse = await QuickBooksService.getTransactionById(
        request.entity,
        request.transactionId,
        request.realmId
    );
    const transaction = transactionResponse.transaction;

    if (!transaction.id) {
        throw new BadRequestError('QuickBooks transaction is missing an id');
    }

    return {
        realmId: transactionResponse.realmId,
        transaction,
    };
};

const addQuickBooksPaymentsToPurchaseOrder = async (
    purchaseOrderId: string,
    requests: AddPoQuickBooksPaymentRequest[],
    userId: string
): Promise<PurchaseOrderQuickBooksPaymentResponse[]> => {
    const po = await assertPurchaseOrderExists(purchaseOrderId);
    const resolvedPayments: ResolvedQuickBooksPayment[] = [];
    const selectedKeys = new Set<string>();

    for (const request of requests) {
        const resolved = await resolveQuickBooksPayment(request);
        const key = getQuickBooksPaymentKey(
            resolved.realmId,
            resolved.transaction.entity,
            resolved.transaction.id
        );

        if (selectedKeys.has(key)) {
            throw new BadRequestError('Duplicate QuickBooks transaction selected');
        }

        selectedKeys.add(key);
        resolvedPayments.push(resolved);
    }

    const existingPayments = await prisma.purchaseOrderQuickBooksPayment.findMany({
        where: {
            removedAt: null,
            OR: resolvedPayments.map(({ realmId, transaction }) => ({
                realmId,
                quickBooksEntity: transaction.entity,
                quickBooksTransactionId: transaction.id,
            })),
        },
        include: { purchaseOrder: true },
    });

    if (existingPayments.length > 0) {
        const existing = existingPayments[0];
        if (!existing) throw new ConflictError('QuickBooks transaction is already linked');

        if (existing.purchaseOrderId === purchaseOrderId) {
            throw new ConflictError(
                'One or more QuickBooks transactions are already linked to this purchase order'
            );
        }

        throw new ConflictError(
            `One or more QuickBooks transactions are already linked to PO ${
                existing.purchaseOrder.poNumber ?? existing.purchaseOrderId
            }`
        );
    }

    const createdPayments = await prisma.$transaction(async (tx) => {
        const created: PurchaseOrderQuickBooksPayment[] = [];

        for (const { realmId, transaction } of resolvedPayments) {
            const payment = await tx.purchaseOrderQuickBooksPayment.create({
                data: {
                    id: ulid(),
                    purchaseOrderId,
                    realmId,
                    quickBooksEntity: transaction.entity,
                    quickBooksTransactionId: transaction.id,
                    docNumber: transaction.docNumber,
                    displayName: transaction.displayName,
                    txnDate: toDateOrNull(transaction.txnDate),
                    totalAmount:
                        transaction.totalAmount === null
                            ? null
                            : new Prisma.Decimal(transaction.totalAmount),
                    currency: transaction.currency,
                    privateNote: transaction.privateNote,
                    lastUpdatedTime: toDateOrNull(transaction.lastUpdatedTime),
                    raw: transaction.raw as Prisma.InputJsonValue,
                    linkedById: userId,
                },
            });

            created.push(payment);
        }

        const firstResolved = resolvedPayments[0];
        if (!firstResolved) throw new BadRequestError('No QuickBooks payments selected');
        const description =
            created.length === 1
                ? `Linked QuickBooks ${firstResolved.transaction.entity} ${
                      firstResolved.transaction.docNumber ?? firstResolved.transaction.id
                  } to PO ${po.poNumber}`
                : `Linked ${created.length} QuickBooks payments to PO ${po.poNumber}`;

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: purchaseOrderId,
            action: 'link',
            description,
            affectedEntityIds: created.map((payment) => payment.id),
            tx,
        });

        return created;
    });

    return createdPayments.map(toQuickBooksPaymentResponse);
};

export const PoService = {
    getPurchaseOrder: async (id: string): Promise<PurchaseOrder> => {
        const po = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                project: true,
                vendor: true,
                rfq: true,
                tradeCategory: true,
                lineItems: {
                    where: { deletedAt: null },
                    orderBy: { lineNumber: 'asc' },
                    include: { unit: true },
                },
                attachments: { include: { document: true } },
            },
        });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        return po;
    },

    getPurchaseOrders: async (
        params: PaginationParams
    ): Promise<{ data: PurchaseOrder[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search } = params;
        const { projectId, vendorId, rfqId, status, tradeCategoryId, ...restFilter } = filter || {};

        const whereClause: Prisma.PurchaseOrderWhereInput = {
            deletedAt: null,
            ...restFilter,
            ...(projectId && { projectId }),
            ...(vendorId && { vendorId }),
            ...(rfqId && { rfqId }),
            ...(status && { status }),
            ...(tradeCategoryId && { tradeCategoryId }),
            ...(search && {
                OR: [
                    { poNumber: { contains: search, mode: 'insensitive' as const } },
                    { description: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };

        const [count, data] = await prisma.$transaction([
            prisma.purchaseOrder.count({ where: whereClause }),
            prisma.purchaseOrder.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as keyof PurchaseOrder]: sortOrder },
                include: {
                    project: true,
                    vendor: true,
                    tradeCategory: true,
                },
            }),
        ]);

        return { data, count };
    },

    createPurchaseOrder: async (
        request: PoCreateRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const {
            projectId,
            vendorId,
            rfqId,
            tradeCategoryId,
            expectedDate,
            taxPercent,
            markupAmount,
            retainagePercent,
            lineItems,
            ...rest
        } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        if (!project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create a PO');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        if (rfqId) {
            const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
            if (!rfq) throw new NotFoundError('RFQ not found');
            checkDeletedAt(rfq);
            if (rfq.projectId !== projectId) {
                throw new BadRequestError('RFQ does not belong to the given project');
            }
        }

        const tradeCategory = await prisma.lookup.findUnique({ where: { id: tradeCategoryId } });
        if (!tradeCategory) throw new NotFoundError('Trade category not found');

        const unitIds = [...new Set(lineItems.map((li) => li.unitId))];
        const units = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        if (units.length !== unitIds.length) {
            throw new NotFoundError('One or more line item units not found');
        }

        const costCodeIds = [
            ...new Set(lineItems.map((li) => li.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        const lineAmounts = lineItems.map((li) =>
            new Prisma.Decimal(li.quantity).times(new Prisma.Decimal(li.unitPrice))
        );
        const subtotal = lineAmounts.reduce((sum, amt) => sum.plus(amt), new Prisma.Decimal(0));
        const taxAmount =
            taxPercent != null
                ? subtotal.times(new Prisma.Decimal(taxPercent)).dividedBy(100)
                : new Prisma.Decimal(0);
        const total = subtotal.plus(taxAmount);

        return await prisma.$transaction(async (tx) => {
            const poNumber = await generatePoNumber(tx, project.jobNumber!);

            const po = await tx.purchaseOrder.create({
                data: {
                    ...rest,
                    id: ulid(),
                    poNumber,
                    projectId,
                    vendorId,
                    rfqId: rfqId ?? null,
                    tradeCategoryId,
                    status: 'DRAFT',
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    subtotal,
                    markupAmount: markupAmount ?? null,
                    taxPercent: taxPercent ?? null,
                    taxAmount: taxPercent != null ? taxAmount : null,
                    total,
                    retainagePercent: retainagePercent ?? 0,
                    createdBy: userId,
                },
            });

            await tx.purchaseOrderLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: ulid(),
                    purchaseOrderId: po.id,
                    lineNumber: i + 1,
                    description: li.description,
                    unitId: li.unitId,
                    quantity: new Prisma.Decimal(li.quantity),
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: li.costCodeId ?? null,
                    notes: li.notes ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: po.id,
                action: 'create',
                description: `Created PO ${po.poNumber} on project ${project.name}`,
                affectedEntityIds: [projectId, vendorId, ...(rfqId ? [rfqId] : [])],
                tx,
            });

            return po;
        });
    },

    createFromRfq: async (rfqId: string, userId: string): Promise<PurchaseOrder> => {
        const rfq = await prisma.rFQ.findUnique({
            where: { id: rfqId },
            include: {
                project: true,
                rfqdeliverables: true,
                vendorQuotes: { where: { isAwarded: true } },
            },
        });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'AWARDED') {
            throw new BadRequestError('RFQ must be AWARDED to generate a PO');
        }
        if (!rfq.awardedVendorId || rfq.awardedAmount === null) {
            throw new BadRequestError('RFQ has no awarded vendor or amount');
        }
        if (!rfq.project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create a PO');
        }
        if (!rfq.rfqdeliverables.length) {
            throw new BadRequestError('RFQ has no deliverables');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: rfq.awardedVendorId } });
        if (!vendor) throw new NotFoundError('Awarded vendor not found');
        checkDeletedAt(vendor);

        const awardedQuote = rfq.vendorQuotes[0];

        const subtotal = new Prisma.Decimal(rfq.awardedAmount);
        const total = subtotal;

        return await prisma.$transaction(async (tx) => {
            const poNumber = await generatePoNumber(tx, rfq.project.jobNumber!);

            const po = await tx.purchaseOrder.create({
                data: {
                    id: ulid(),
                    poNumber,
                    projectId: rfq.projectId,
                    vendorId: rfq.awardedVendorId!,
                    rfqId: rfq.id,
                    tradeCategoryId: rfq.typeId,
                    status: 'DRAFT',
                    description: rfq.description ?? rfq.title,
                    leadTime: awardedQuote?.leadTime ?? null,
                    subtotal,
                    total,
                    paymentTerms: vendor.paymentTerms,
                    createdBy: userId,
                },
            });

            await tx.purchaseOrderLineItem.createMany({
                data: rfq.rfqdeliverables.map((d, i) => ({
                    id: ulid(),
                    purchaseOrderId: po.id,
                    lineNumber: i + 1,
                    description: `Item ${i + 1}`,
                    unitId: d.unitId,
                    quantity: d.quantity,
                    unitPrice: new Prisma.Decimal(0),
                    amount: new Prisma.Decimal(0),
                    costCodeId: d.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: po.id,
                action: 'create',
                description: `Created PO ${po.poNumber} from RFQ ${rfq.rfqNumber}`,
                affectedEntityIds: [rfq.id, rfq.projectId, rfq.awardedVendorId!],
                tx,
            });

            return po;
        });
    },

    updatePurchaseOrder: async (
        request: PoUpdateRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const {
            id,
            projectId,
            vendorId,
            rfqId,
            tradeCategoryId,
            expectedDate,
            taxPercent,
            markupAmount,
            retainagePercent,
            lineItems,
            ...rest
        } = request;

        const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!existing) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(existing);
        if (existing.status !== 'DRAFT') {
            throw new BadRequestError('PO can only be updated while in DRAFT');
        }
        if (existing.projectId !== projectId) {
            throw new BadRequestError('PO project cannot be changed');
        }

        const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!vendor) throw new NotFoundError('Vendor not found');
        checkDeletedAt(vendor);

        if (rfqId) {
            const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
            if (!rfq) throw new NotFoundError('RFQ not found');
            checkDeletedAt(rfq);
            if (rfq.projectId !== projectId) {
                throw new BadRequestError('RFQ does not belong to the given project');
            }
        }

        const tradeCategory = await prisma.lookup.findUnique({ where: { id: tradeCategoryId } });
        if (!tradeCategory) throw new NotFoundError('Trade category not found');

        const unitIds = [...new Set(lineItems.map((li) => li.unitId))];
        const units = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        if (units.length !== unitIds.length) {
            throw new NotFoundError('One or more line item units not found');
        }

        const costCodeIds = [
            ...new Set(lineItems.map((li) => li.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        const lineAmounts = lineItems.map((li) =>
            new Prisma.Decimal(li.quantity).times(new Prisma.Decimal(li.unitPrice))
        );
        const subtotal = lineAmounts.reduce((sum, amt) => sum.plus(amt), new Prisma.Decimal(0));
        const taxAmount =
            taxPercent != null
                ? subtotal.times(new Prisma.Decimal(taxPercent)).dividedBy(100)
                : new Prisma.Decimal(0);
        const total = subtotal.plus(taxAmount);

        return await prisma.$transaction(async (tx) => {
            await RevisionService.create(tx, {
                entityType: 'PURCHASE_ORDER',
                entityId: id,
                userId,
            });

            const updated = await tx.purchaseOrder.update({
                where: { id },
                data: {
                    ...rest,
                    vendorId,
                    rfqId: rfqId ?? null,
                    tradeCategoryId,
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    subtotal,
                    markupAmount: markupAmount ?? null,
                    taxPercent: taxPercent ?? null,
                    taxAmount: taxPercent != null ? taxAmount : null,
                    total,
                    retainagePercent: retainagePercent ?? 0,
                },
            });

            await tx.purchaseOrderLineItem.deleteMany({ where: { purchaseOrderId: id } });
            await tx.purchaseOrderLineItem.createMany({
                data: lineItems.map((li, i) => ({
                    id: ulid(),
                    purchaseOrderId: id,
                    lineNumber: i + 1,
                    description: li.description,
                    unitId: li.unitId,
                    quantity: new Prisma.Decimal(li.quantity),
                    unitPrice: new Prisma.Decimal(li.unitPrice),
                    amount: lineAmounts[i],
                    costCodeId: li.costCodeId ?? null,
                    notes: li.notes ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: id,
                action: 'update',
                description: `Updated PO ${updated.poNumber}`,
                affectedEntityIds: [
                    projectId,
                    vendorId,
                    ...(rfqId ? [rfqId] : []),
                    ...(existing.vendorId !== vendorId ? [existing.vendorId] : []),
                    ...(existing.rfqId && existing.rfqId !== rfqId ? [existing.rfqId] : []),
                ],
                tx,
            });

            return updated;
        });
    },

    getQuickBooksPayments: async (
        purchaseOrderId: string
    ): Promise<PurchaseOrderQuickBooksPaymentResponse[]> => {
        await assertPurchaseOrderExists(purchaseOrderId);

        const payments = await prisma.purchaseOrderQuickBooksPayment.findMany({
            where: { purchaseOrderId, removedAt: null },
            orderBy: [{ txnDate: 'desc' }, { createdAt: 'desc' }],
        });

        return payments.map(toQuickBooksPaymentResponse);
    },

    getQuickBooksPaymentOptions: async (
        purchaseOrderId: string
    ): Promise<QuickBooksPaymentOptionsResponse> => {
        await assertPurchaseOrderExists(purchaseOrderId);

        const response = await QuickBooksService.getTransactions({
            entities: QUICKBOOKS_PO_PAYMENT_ENTITIES,
            maxResults: 25,
        });
        const keys = response.transactions.map((transaction) =>
            getQuickBooksPaymentKey(response.realmId, transaction.entity, transaction.id)
        );
        const linkedPayments =
            keys.length > 0
                ? await prisma.purchaseOrderQuickBooksPayment.findMany({
                      where: {
                          removedAt: null,
                          OR: response.transactions.map((transaction) => ({
                              realmId: response.realmId,
                              quickBooksEntity: transaction.entity,
                              quickBooksTransactionId: transaction.id,
                          })),
                      },
                      include: {
                          purchaseOrder: {
                              select: { id: true, poNumber: true },
                          },
                      },
                  })
                : [];
        const linkedMap = new Map(
            linkedPayments.map((payment) => [
                getQuickBooksPaymentKey(
                    payment.realmId,
                    payment.quickBooksEntity,
                    payment.quickBooksTransactionId
                ),
                payment,
            ])
        );

        return {
            realmId: response.realmId,
            companyName: response.companyName,
            environment: response.environment,
            fetchedAt: response.fetchedAt,
            transactions: response.transactions.map((transaction) => {
                const linked = linkedMap.get(
                    getQuickBooksPaymentKey(response.realmId, transaction.entity, transaction.id)
                ) as PaymentWithPurchaseOrder | undefined;

                return {
                    ...transaction,
                    realmId: response.realmId,
                    linkedPurchaseOrder: linked?.purchaseOrder
                        ? {
                              id: linked.purchaseOrder.id,
                              poNumber: linked.purchaseOrder.poNumber,
                          }
                        : null,
                };
            }),
        };
    },

    addQuickBooksPayment: async (
        purchaseOrderId: string,
        request: AddPoQuickBooksPaymentRequest,
        userId: string
    ): Promise<PurchaseOrderQuickBooksPaymentResponse> => {
        const payments = await addQuickBooksPaymentsToPurchaseOrder(
            purchaseOrderId,
            [request],
            userId
        );
        const payment = payments[0];
        if (!payment) throw new BadRequestError('No QuickBooks payment was added');

        return payment;
    },

    addQuickBooksPayments: async (
        purchaseOrderId: string,
        request: AddPoQuickBooksPaymentsRequest,
        userId: string
    ): Promise<PurchaseOrderQuickBooksPaymentResponse[]> => {
        return addQuickBooksPaymentsToPurchaseOrder(purchaseOrderId, request.payments, userId);
    },

    addAttachment: async (
        request: AddPoAttachmentRequest,
        userId: string
    ): Promise<POAttachment> => {
        const { purchaseOrderId, documentId } = request;

        const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be added while PO is in DRAFT');
        }

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        const existing = await prisma.pOAttachment.findUnique({ where: { documentId } });
        if (existing) throw new ConflictError('File already attached to a PO');

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getProjectSubFolderId(
                po.projectId,
                'PURCHASE_ORDER',
                tx
            );
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.pOAttachment.create({
                data: { id: ulid(), purchaseOrderId, documentId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: purchaseOrderId,
                action: 'link',
                description: `Attached file ${file.name} to PO ${po.poNumber}`,
                affectedEntityIds: [documentId],
                tx,
            });

            return attachment;
        });
    },

    removeAttachment: async (request: RemovePoAttachmentRequest, userId: string): Promise<void> => {
        const { id } = request;

        const attachment = await prisma.pOAttachment.findUnique({
            where: { id },
            include: { purchaseOrder: true, document: true },
        });
        if (!attachment) throw new NotFoundError('Attachment not found');
        checkDeletedAt(attachment.purchaseOrder);
        if (attachment.purchaseOrder.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be removed while PO is in DRAFT');
        }

        await prisma.pOAttachment.delete({ where: { id } });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: attachment.purchaseOrderId,
            action: 'unlink',
            description: `Removed attachment ${attachment.document.name} from PO ${attachment.purchaseOrder.poNumber}`,
            affectedEntityIds: [attachment.documentId],
        });
    },

    removeQuickBooksPayment: async (
        purchaseOrderId: string,
        paymentId: string,
        userId: string
    ): Promise<void> => {
        const payment = await prisma.purchaseOrderQuickBooksPayment.findFirst({
            where: { id: paymentId, purchaseOrderId, removedAt: null },
            include: { purchaseOrder: true },
        });
        if (!payment) throw new NotFoundError('PO payment not found');
        checkDeletedAt(payment.purchaseOrder);

        await prisma.$transaction(async (tx) => {
            await tx.purchaseOrderQuickBooksPayment.update({
                where: { id: payment.id },
                data: {
                    removedAt: new Date(),
                    removedById: userId,
                },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'purchaseOrder',
                entityId: purchaseOrderId,
                action: 'unlink',
                description: `Removed QuickBooks ${payment.quickBooksEntity} ${payment.docNumber ?? payment.quickBooksTransactionId} from PO ${payment.purchaseOrder.poNumber}`,
                affectedEntityIds: [payment.id],
                tx,
            });
        });
    },

    setDraft: async (request: SetPoDraftRequest, userId: string): Promise<PurchaseOrder> => {
        const { id } = request;
        const po = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status === 'DRAFT') {
            throw new BadRequestError('PO is already in DRAFT');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: 'DRAFT',
                issuedBy: null,
                issuedAt: null,
                deliveryDate: null,
                cancelledBy: null,
                cancelledAt: null,
                cancellationReason: null,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: id,
            action: 'update',
            description: `Set PO ${updated.poNumber} to DRAFT`,
            affectedEntityIds: [po.projectId, po.vendorId, ...(po.rfqId ? [po.rfqId] : [])],
        });

        return updated;
    },

    setIssued: async (request: SetPoIssuedRequest, userId: string): Promise<PurchaseOrder> => {
        const { id } = request;
        const po = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status !== 'DRAFT') {
            throw new BadRequestError('Only DRAFT POs can be issued');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'ISSUED', issuedBy: userId, issuedAt: new Date() },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: id,
            action: 'update',
            description: `Issued PO ${updated.poNumber}`,
            affectedEntityIds: [po.projectId, po.vendorId, ...(po.rfqId ? [po.rfqId] : [])],
        });

        return updated;
    },

    setDelivered: async (
        request: SetPoDeliveredRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const { id, deliveryDate } = request;
        const po = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status !== 'ISSUED') {
            throw new BadRequestError('Only ISSUED POs can be marked as DELIVERED');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: { status: 'DELIVERED', deliveryDate: new Date(deliveryDate) },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: id,
            action: 'update',
            description: `Marked PO ${updated.poNumber} as DELIVERED`,
            affectedEntityIds: [po.projectId, po.vendorId, ...(po.rfqId ? [po.rfqId] : [])],
        });

        return updated;
    },

    setCancelled: async (
        request: SetPoCancelledRequest,
        userId: string
    ): Promise<PurchaseOrder> => {
        const { id, cancellationReason } = request;
        const po = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!po) throw new NotFoundError('Purchase order not found');
        checkDeletedAt(po);
        if (po.status === 'CANCELLED') {
            throw new BadRequestError('PO is already cancelled');
        }
        if (po.status === 'DELIVERED') {
            throw new BadRequestError('Delivered PO cannot be cancelled');
        }

        const updated = await prisma.purchaseOrder.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledBy: userId,
                cancelledAt: new Date(),
                cancellationReason,
            },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'purchaseOrder',
            entityId: id,
            action: 'update',
            description: `Cancelled PO ${updated.poNumber}`,
            affectedEntityIds: [po.projectId, po.vendorId, ...(po.rfqId ? [po.rfqId] : [])],
        });

        return updated;
    },
};
