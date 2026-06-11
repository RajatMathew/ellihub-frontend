import { Prisma } from '@db/client';

type Tx = Prisma.TransactionClient;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const generateScoNumber = async (
    tx: Tx,
    purchaseOrderId: string,
    poNumber: string
): Promise<string> => {
    const prefix = `${poNumber}-`;
    const suffixPattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
    const existingScos = await tx.subChangeOrder.findMany({
        where: { purchaseOrderId },
        select: { scoNumber: true },
    });

    const highestExistingSequence = existingScos.reduce((highest, sco) => {
        const match = suffixPattern.exec(sco.scoNumber);
        if (!match) return highest;
        return Math.max(highest, parseInt(match[1], 10) || 0);
    }, 0);

    let seq = highestExistingSequence + 1;
    let scoNumber = `${prefix}${String(seq).padStart(2, '0')}`;

    while (await tx.subChangeOrder.findUnique({ where: { scoNumber }, select: { id: true } })) {
        seq += 1;
        scoNumber = `${prefix}${String(seq).padStart(2, '0')}`;
    }

    return scoNumber;
};
