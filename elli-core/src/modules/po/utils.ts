import { Prisma } from '@db/client';

type Tx = Prisma.TransactionClient;

export const generatePoNumber = async (tx: Tx): Promise<string> => {
    const prefix = 'PO-';
    const purchaseOrders = await tx.purchaseOrder.findMany({
        select: { poNumber: true },
    });
    const highestExistingSequence = purchaseOrders.reduce((highest, po) => {
        const match = /^PO-(?:.*-)?(\d+)$/.exec(po.poNumber);
        if (!match) return highest;
        return Math.max(highest, parseInt(match[1], 10) || 0);
    }, 0);
    let seq = Math.max(highestExistingSequence, purchaseOrders.length) + 1;
    let poNumber = `${prefix}${String(seq).padStart(3, '0')}`;

    while (await tx.purchaseOrder.findUnique({ where: { poNumber }, select: { id: true } })) {
        seq += 1;
        poNumber = `${prefix}${String(seq).padStart(3, '0')}`;
    }

    return poNumber;
};
