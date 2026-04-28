import { Prisma } from '@db/client';

type Tx = Prisma.TransactionClient;

export const generateScoNumber = async (tx: Tx, jobNumber: string): Promise<string> => {
    const prefix = `SCO-${jobNumber}-`;
    const latest = await tx.subChangeOrder.findFirst({
        where: { scoNumber: { startsWith: prefix } },
        orderBy: { scoNumber: 'desc' },
        select: { scoNumber: true },
    });
    let seq = 1;
    if (latest?.scoNumber) {
        const suffix = latest.scoNumber.slice(prefix.length);
        seq = (parseInt(suffix, 10) || 0) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
};
