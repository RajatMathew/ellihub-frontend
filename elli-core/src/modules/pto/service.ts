import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';
import { ulid } from 'ulid';

import { PTOCreateRequest, PTOReviewRequest, PTOUpdateRequest } from './models';
import { assertPtoType, findPto, ptoInclude } from './utils';

export const PTOService = {
    list: async (params: PaginationParams): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const { search: filterSearch, ...restFilter } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
        };

        if (search) {
            whereClause.OR = [
                { reason: { contains: search, mode: 'insensitive' as const } },
                { employee: { name: { contains: search, mode: 'insensitive' as const } } },
            ];
        }

        const [count, data] = await prisma.$transaction([
            prisma.paidTimeOff.count({ where: whereClause }),
            prisma.paidTimeOff.findMany({
                where: whereClause,
                skip,
                take,
                orderBy: { [sortBy as string]: sortOrder },
                include: ptoInclude,
            }),
        ]);

        return { data, count };
    },

    get: async (id: string) => findPto(id),

    create: async (request: PTOCreateRequest) => {
        const employee = await prisma.employee.findUnique({ where: { id: request.employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        await assertPtoType(request.typeId);

        return await prisma.paidTimeOff.create({
            data: {
                id: ulid(),
                employeeId: request.employeeId,
                typeId: request.typeId,
                startDate: request.startDate,
                endDate: request.endDate,
                reason: request.reason,
            },
            include: ptoInclude,
        });
    },

    update: async (request: PTOUpdateRequest) => {
        const { id, ...data } = request;
        const pto = await findPto(id);

        if (pto.status !== 'PENDING') {
            throw new BadRequestError('Only pending PTO requests can be updated');
        }

        if (data.typeId && data.typeId !== pto.typeId) {
            await assertPtoType(data.typeId);
        }

        const startDate = data.startDate ?? pto.startDate;
        const endDate = data.endDate ?? pto.endDate;
        if (endDate < startDate) {
            throw new BadRequestError('endDate must be on or after startDate');
        }

        return await prisma.paidTimeOff.update({
            where: { id },
            data,
            include: ptoInclude,
        });
    },

    delete: async (id: string): Promise<void> => {
        const pto = await findPto(id);
        await prisma.paidTimeOff.update({
            where: { id: pto.id },
            data: { deletedAt: new Date() },
        });
    },

    approve: async (request: PTOReviewRequest, reviewerId: string) => {
        const pto = await findPto(request.id);
        if (pto.status === 'APPROVED') {
            throw new BadRequestError('PTO is already approved');
        }

        return await prisma.paidTimeOff.update({
            where: { id: pto.id },
            data: {
                status: 'APPROVED',
                reviewedById: reviewerId,
                reviewedAt: new Date(),
                reviewNote: request.note,
            },
            include: ptoInclude,
        });
    },

    reject: async (request: PTOReviewRequest, reviewerId: string) => {
        const pto = await findPto(request.id);
        if (pto.status === 'REJECTED') {
            throw new BadRequestError('PTO is already rejected');
        }

        return await prisma.paidTimeOff.update({
            where: { id: pto.id },
            data: {
                status: 'REJECTED',
                reviewedById: reviewerId,
                reviewedAt: new Date(),
                reviewNote: request.note,
            },
            include: ptoInclude,
        });
    },
};
