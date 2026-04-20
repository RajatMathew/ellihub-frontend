import { RFQ } from '@db/client';
import { prisma } from '@lib/prisma';
import { ActivityLogService } from '@modules/activity-log';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import { RfqCreateRequest } from './models';

export const RfqService = {
    createRfq: async (request: RfqCreateRequest, userId: string): Promise<RFQ> => {
        const { projectId, typeId, bidDeadline, ...rest } = request;

        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        checkDeletedAt(project);
        if (!project.jobNumber) {
            throw new BadRequestError('Project must have a job number to create an RFQ');
        }

        const type = await prisma.lookup.findUnique({ where: { id: typeId } });
        if (!type) throw new NotFoundError('RFQ type not found');

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
};
