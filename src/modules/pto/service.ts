import { AccessContext } from '@lib/access';
import { prisma } from '@lib/prisma';
import { PaginationParams } from '@middleware';
import { BadRequestError, ForbiddenError, NotFoundError } from '@utils';
import { generateNanoId } from '@utils/generateNanoId';
import { checkDeletedAt } from '@utils/soft-delete';

import { PTOCreateRequest, PTOReviewRequest, PTOUpdateRequest } from './models';
import { assertPtoType, findPto, ptoInclude } from './utils';

function assertOwnPtoAccess(access: AccessContext, employeeId: string) {
    if (access.isAdmin) return;
    if (!access.employeeId || access.employeeId !== employeeId) {
        throw new ForbiddenError('PTO access denied');
    }
}

export const PTOService = {
    list: async (
        params: PaginationParams,
        access: AccessContext
    ): Promise<{ data: unknown[]; count: number }> => {
        const { filter, skip, take, sortBy, sortOrder, search: querySearch } = params;
        const { search: filterSearch, ...restFilter } = filter || {};
        const search = querySearch || filterSearch;

        const whereClause: Record<string, unknown> = {
            deletedAt: null,
            ...restFilter,
            ...(!access.isAdmin && {
                employeeId: access.employeeId ?? '__no_employee_access__',
            }),
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

    get: async (id: string, access: AccessContext) => {
        const pto = await findPto(id);
        assertOwnPtoAccess(access, pto.employeeId);
        return pto;
    },

    create: async (request: PTOCreateRequest, access: AccessContext) => {
        const employeeId = access.isAdmin ? request.employeeId : access.employeeId;
        if (!employeeId) {
            throw new BadRequestError(
                access.isAdmin
                    ? 'Employee is required'
                    : 'Your user account is not linked to an employee profile'
            );
        }

        assertOwnPtoAccess(access, employeeId);
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new NotFoundError('Employee not found');
        checkDeletedAt(employee);

        await assertPtoType(request.typeId);

        return await prisma.paidTimeOff.create({
            data: {
                id: generateNanoId(),
                employeeId,
                typeId: request.typeId,
                startDate: request.startDate,
                endDate: request.endDate,
                reason: request.reason,
            },
            include: ptoInclude,
        });
    },

    update: async (request: PTOUpdateRequest, access: AccessContext) => {
        const { id, ...data } = request;
        const pto = await findPto(id);
        assertOwnPtoAccess(access, pto.employeeId);

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

    delete: async (id: string, access: AccessContext): Promise<void> => {
        const pto = await findPto(id);
        assertOwnPtoAccess(access, pto.employeeId);
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
