import { Prisma, Revision, RevisionEntityType } from '@db/client';
import { TransactionClient } from '@db/internal/prismaNamespace';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { NotFoundError } from '@utils';
import { ulid } from 'ulid';

type CreateRevisionParams = {
    entityType: RevisionEntityType;
    entityId: string;
    userId: string;
    note?: string | null;
};

const includeUser = {
    createdBy: { select: { id: true, name: true, email: true, image: true } },
} as const;

const fetchSnapshot = async (
    client: TransactionClient,
    entityType: RevisionEntityType,
    entityId: string
): Promise<unknown> => {
    switch (entityType) {
        case 'RFQ':
            return client.rFQ.findUnique({
                where: { id: entityId },
                include: {
                    rfqdeliverables: { include: { unit: true } },
                    rfqattachments: { include: { document: true } },
                    vendorQuotes: {
                        include: { attachments: { include: { document: true } } },
                    },
                },
            });
        case 'PURCHASE_ORDER':
            return client.purchaseOrder.findUnique({
                where: { id: entityId },
                include: {
                    lineItems: { include: { unit: true } },
                    attachments: { include: { document: true } },
                },
            });
        case 'SUB_CHANGE_ORDER':
            return client.subChangeOrder.findUnique({
                where: { id: entityId },
                include: {
                    lineItems: { include: { unit: true } },
                    attachments: { include: { document: true } },
                },
            });
        case 'INVOICE':
            return client.invoice.findUnique({
                where: { id: entityId },
                include: { attachments: { include: { document: true } } },
            });
        case 'PROJECT':
            return client.project.findUnique({ where: { id: entityId } });
    }
};

export const RevisionService = {
    /**
     * Snapshot the current state of an entity into the Revision table.
     * Call this INSIDE the same transaction as the update, BEFORE mutating the entity,
     * so the snapshot captures the pre-update state and rolls back on failure.
     */
    create: async (tx: TransactionClient, params: CreateRevisionParams): Promise<Revision> => {
        const { entityType, entityId, userId, note } = params;

        const snapshot = await fetchSnapshot(tx, entityType, entityId);
        if (!snapshot) {
            throw new NotFoundError(`${entityType} ${entityId} not found for revision snapshot`);
        }

        const previous = await tx.revision.findFirst({
            where: { entityType, entityId },
            orderBy: { version: 'desc' },
            select: { version: true },
        });
        const version = (previous?.version ?? 0) + 1;

        return tx.revision.create({
            data: {
                id: ulid(),
                entityType,
                entityId,
                version,
                snapshot: snapshot as Prisma.InputJsonValue,
                changeNote: note ?? null,
                createdById: userId,
            },
        });
    },

    list: async (
        entityType: RevisionEntityType,
        entityId: string,
        params: PaginationParams
    ): Promise<{ data: Omit<Revision, 'snapshot'>[]; count: number }> => {
        const { skip, take } = params;

        const [count, data] = await prisma.$transaction([
            prisma.revision.count({ where: { entityType, entityId } }),
            prisma.revision.findMany({
                where: { entityType, entityId },
                skip,
                take,
                orderBy: { version: 'desc' },
                select: {
                    id: true,
                    entityType: true,
                    entityId: true,
                    version: true,
                    changeNote: true,
                    createdAt: true,
                    createdById: true,
                    ...includeUser,
                },
            }),
        ]);

        return { data: data as unknown as Omit<Revision, 'snapshot'>[], count };
    },

    get: async (id: string): Promise<Revision> => {
        const revision = await prisma.revision.findUnique({
            where: { id },
            include: includeUser,
        });
        if (!revision) throw new NotFoundError('Revision not found');
        return revision;
    },
};
