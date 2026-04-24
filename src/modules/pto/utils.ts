import { prisma } from '@lib/prisma';
import { LookupType } from '@modules/lookup/models';
import { BadRequestError, NotFoundError } from '@utils';
import { checkDeletedAt } from '@utils/soft-delete';

export const ptoInclude = {
    type: true,
    employee: { select: { id: true, name: true, email: true } },
} as const;

export const assertPtoType = async (typeId: string) => {
    const type = await prisma.lookup.findUnique({ where: { id: typeId } });
    if (!type) throw new NotFoundError('PTO type not found');
    if (type.type !== LookupType.PTO_TYPE) {
        throw new BadRequestError('Invalid PTO type');
    }
};

export const findPto = async (id: string) => {
    const pto = await prisma.paidTimeOff.findUnique({
        where: { id },
        include: ptoInclude,
    });
    if (!pto) throw new NotFoundError('PTO not found');
    checkDeletedAt(pto);
    return pto;
};
