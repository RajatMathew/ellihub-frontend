import { RFQ, RFQAttachment } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log';
import { FileService } from '@modules/file/services';
import { BadRequestError, ConflictError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import {
    AddRfqAttachmentRequest,
    RemoveRfqAttachmentRequest,
    RfqCreateRequest,
    RfqUpdateRequest,
} from './models';

export const RfqService = {
    createRfq: async (request: RfqCreateRequest, userId: string): Promise<RFQ> => {
        const { projectId, typeId, bidDeadline, deliverables, ...rest } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        if (!project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create an RFQ');
        }

        const type = await prisma.lookup.findUnique({ where: { id: typeId } });
        if (!type) throw new NotFoundError('RFQ type not found');

        const unitIds = [...new Set(deliverables.map((d) => d.unitId))];
        const units = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        if (units.length !== unitIds.length) {
            throw new NotFoundError('One or more deliverable units not found');
        }

        const costCodeIds = [
            ...new Set(deliverables.map((d) => d.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        return await prisma.$transaction(async (tx) => {
            const prefix = `${project.jobNumber}-`;
            const latest = await tx.rFQ.findFirst({
                where: { rfqNumber: { startsWith: prefix } },
                orderBy: { rfqNumber: 'desc' },
                select: { rfqNumber: true },
            });
            let seq = 1;
            if (latest?.rfqNumber) {
                const suffix = latest.rfqNumber.slice(prefix.length);
                seq = (parseInt(suffix, 10) || 0) + 1;
            }
            const rfqNumber = `${prefix}${String(seq).padStart(3, '0')}`;

            const rfq = await tx.rFQ.create({
                data: {
                    ...rest,
                    id: ulid(),
                    rfqNumber,
                    projectId,
                    typeId,
                    bidDeadline: new Date(bidDeadline),
                    createdBy: userId,
                },
            });

            await tx.rFQDeliverable.createMany({
                data: deliverables.map((d) => ({
                    id: ulid(),
                    rfqId: rfq.id,
                    unitId: d.unitId,
                    quantity: d.quantity,
                    costCodeId: d.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: rfq.id,
                action: 'create',
                description: `Created RFQ ${rfq.rfqNumber} on project ${project.name}`,
                tx,
            });

            return rfq;
        });
    },

    setDraft: async (id: string, userId: string): Promise<RFQ> => {
        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        const updated = await prisma.rFQ.update({
            where: { id },
            data: { status: 'DRAFT' },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: id,
            action: 'update',
            description: `Set RFQ ${updated.rfqNumber} to DRAFT`,
        });

        return updated;
    },

    updateRfq: async (request: RfqUpdateRequest, userId: string): Promise<RFQ> => {
        const { id, typeId, bidDeadline, deliverables, ...rest } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'DRAFT') {
            throw new BadRequestError('RFQ can only be updated while in DRAFT');
        }

        const type = await prisma.lookup.findUnique({ where: { id: typeId } });
        if (!type) throw new NotFoundError('RFQ type not found');

        const unitIds = [...new Set(deliverables.map((d) => d.unitId))];
        const units = await prisma.lookup.findMany({ where: { id: { in: unitIds } } });
        if (units.length !== unitIds.length) {
            throw new NotFoundError('One or more deliverable units not found');
        }

        const costCodeIds = [
            ...new Set(deliverables.map((d) => d.costCodeId).filter((v): v is string => !!v)),
        ];
        if (costCodeIds.length) {
            const costCodes = await prisma.costCode.findMany({
                where: { id: { in: costCodeIds } },
            });
            if (costCodes.length !== costCodeIds.length) {
                throw new NotFoundError('One or more cost codes not found');
            }
        }

        return await prisma.$transaction(async (tx) => {
            const updated = await tx.rFQ.update({
                where: { id },
                data: {
                    ...rest,
                    typeId,
                    bidDeadline: new Date(bidDeadline),
                },
            });

            await tx.rFQDeliverable.deleteMany({ where: { rfqId: id } });
            await tx.rFQDeliverable.createMany({
                data: deliverables.map((d) => ({
                    id: ulid(),
                    rfqId: id,
                    unitId: d.unitId,
                    quantity: d.quantity,
                    costCodeId: d.costCodeId ?? null,
                })),
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: id,
                action: 'update',
                description: `Updated RFQ ${updated.rfqNumber}`,
                tx,
            });

            return updated;
        });
    },

    addAttachment: async (
        request: AddRfqAttachmentRequest,
        userId: string
    ): Promise<RFQAttachment> => {
        const { rfqId, documentId } = request;

        const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);
        if (rfq.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be added while RFQ is in DRAFT');
        }

        const file = await prisma.file.findUnique({ where: { id: documentId } });
        if (!file) throw new NotFoundError('File not found');
        checkDeletedAt(file);

        const existing = await prisma.rFQAttachment.findUnique({ where: { documentId } });
        if (existing) throw new ConflictError('File already attached to an RFQ');

        return await prisma.$transaction(async (tx) => {
            const folderId = await FileService.getProjectSubFolderId(rfq.projectId, 'RFQ', tx);
            await FileService.moveFileToFolder(documentId, folderId, tx);

            const attachment = await tx.rFQAttachment.create({
                data: { id: ulid(), rfqId, documentId },
            });

            await ActivityLogService.log({
                userId,
                entityType: 'rfq',
                entityId: rfqId,
                action: 'link',
                description: `Attached file ${file.name} to RFQ ${rfq.rfqNumber}`,
                tx,
            });

            return attachment;
        });
    },

    removeAttachment: async (
        request: RemoveRfqAttachmentRequest,
        userId: string
    ): Promise<void> => {
        const { id } = request;

        const attachment = await prisma.rFQAttachment.findUnique({
            where: { id },
            include: { rfq: true, document: true },
        });
        if (!attachment) throw new NotFoundError('Attachment not found');
        if (attachment.rfq.status !== 'DRAFT') {
            throw new BadRequestError('Attachments can only be removed while RFQ is in DRAFT');
        }

        await prisma.rFQAttachment.delete({ where: { id } });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: attachment.rfqId,
            action: 'unlink',
            description: `Removed attachment ${attachment.document.name} from RFQ ${attachment.rfq.rfqNumber}`,
        });
    },

    setPublished: async (id: string, userId: string): Promise<RFQ> => {
        const rfq = await prisma.rFQ.findUnique({ where: { id } });
        if (!rfq) throw new NotFoundError('RFQ not found');
        checkDeletedAt(rfq);

        const updated = await prisma.rFQ.update({
            where: { id },
            data: { status: 'PUBLISHED' },
        });

        await ActivityLogService.log({
            userId,
            entityType: 'rfq',
            entityId: id,
            action: 'update',
            description: `Set RFQ ${updated.rfqNumber} to PUBLISHED`,
        });

        return updated;
    },
};
