import { prisma } from '@lib/prisma';
import { startOfToday } from 'date-fns';

export const syncEmployeeLeaveStatus = async () => {
    const today = startOfToday();

    const onLeave = await prisma.paidTimeOff.findMany({
        where: {
            status: 'APPROVED',
            deletedAt: null,
            startDate: { lte: today },
            endDate: { gte: today },
        },
        select: { employeeId: true },
        distinct: ['employeeId'],
    });
    const onLeaveIds = onLeave.map((p) => p.employeeId);

    await prisma.employee.updateMany({
        where: { status: 'ON_LEAVE', id: { notIn: onLeaveIds } },
        data: { status: 'ACTIVE' },
    });

    if (onLeaveIds.length) {
        await prisma.employee.updateMany({
            where: { status: 'ACTIVE', id: { in: onLeaveIds } },
            data: { status: 'ON_LEAVE' },
        });
    }
};

export const ptoSchedules = [
    {
        name: 'sync-employee-leave-status',
        cron: '0 0 * * *',
        run: syncEmployeeLeaveStatus,
    },
];
