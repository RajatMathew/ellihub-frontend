import { Prisma } from '@db/client';

type Tx = Prisma.TransactionClient;

export const generatePoNumber = async (tx: Tx, jobNumber: string): Promise<string> => {
    const prefix = `PO-${jobNumber}-`;
    const latest = await tx.purchaseOrder.findFirst({
        where: { poNumber: { startsWith: prefix } },
        orderBy: { poNumber: 'desc' },
        select: { poNumber: true },
    });
    let seq = 1;
    if (latest?.poNumber) {
        const suffix = latest.poNumber.slice(prefix.length);
        seq = (parseInt(suffix, 10) || 0) + 1;
    }
    return `${prefix}${String(seq).padStart(3, '0')}`;
};
