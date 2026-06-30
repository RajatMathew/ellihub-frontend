import { Prisma } from '@db/client';

type Tx = Prisma.TransactionClient;

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const generateInvoiceNumber = async (
    tx: Tx,
    purchaseOrderId: string,
    poNumber: string
): Promise<string> => {
    const prefix = `${poNumber}-INV-`;
    const suffixPattern = new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`);
    const existingInvoices = await tx.invoice.findMany({
        where: { purchaseOrderId },
        select: { invoiceNumber: true },
    });

    const highestExistingSequence = existingInvoices.reduce((highest, invoice) => {
        const match = suffixPattern.exec(invoice.invoiceNumber);
        if (!match) return highest;
        return Math.max(highest, parseInt(match[1], 10) || 0);
    }, 0);

    let seq = highestExistingSequence + 1;
    let invoiceNumber = `${prefix}${String(seq).padStart(3, '0')}`;

    while (await tx.invoice.findFirst({ where: { invoiceNumber }, select: { id: true } })) {
        seq += 1;
        invoiceNumber = `${prefix}${String(seq).padStart(3, '0')}`;
    }

    return invoiceNumber;
};
