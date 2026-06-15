import { Decimal } from 'decimal.js';

type DecimalLike = { toString(): string };

type RfqBidComparisonInput = {
    rfqNumber: string;
    title: string;
    bidDeadline: Date;
    status: string;
    rfqdeliverables: Array<{
        id: string;
        name: string;
        quantity: DecimalLike | number;
        unit: { label: string };
    }>;
    vendorQuotes: Array<{
        id: string;
        vendorId: string;
        vendor: { name: string };
        hasSubmittedQuote: boolean;
        quotedAmount: DecimalLike | number | null;
        isAwarded: boolean;
        leadTime: string | null;
        attachments: Array<{
            id: string;
            documentId: string;
            document: {
                id: string;
                name: string | null;
                displayName: string | null;
                mimeType?: string | null;
                deletedAt: Date | null;
            };
        }>;
    }>;
};

export type RfqBidComparison = {
    rfq: {
        rfqNumber: string;
        title: string;
        estimatedBudget: number | null;
        bidDeadline: Date;
        status: { id: string; name: string; label: string };
    };
    deliverables: Array<{
        id: string;
        sequenceNumber: number | null;
        description: string;
        quantity: number;
        unit: string;
        estimatedUnitPrice: number | null;
        estimatedTotal: number | null;
    }>;
    quotes: Array<{
        quoteId: string;
        vendorId: string;
        vendorName: string;
        status: { id: string; name: string; label: string };
        totalAmount: number;
        taxAmount: number | null;
        grandTotal: number;
        leadTimeDays: number | null;
        warrantyPeriod: string | null;
        isResponsive: boolean | null;
        attachments: Array<{
            id: string;
            documentId: string;
            document: { id: string; name: string; mimeType?: string };
        }>;
        lineItems: Array<{
            deliverableId: string;
            sequenceNumber: number | null;
            unitPrice: number;
            quantity: number;
            lineTotal: number;
            notes: string | null;
            alternateProposed: boolean;
        }>;
    }>;
    statistics: {
        lowestQuote: number | null;
        highestQuote: number | null;
        averageQuote: number | null;
        medianQuote: number | null;
        quotesSubmitted: number;
        quotesExpected: number;
        budgetVariance: number | null;
    };
};

function toDecimal(value: DecimalLike | number | null | undefined): Decimal | null {
    if (value == null) return null;
    try {
        return new Decimal(value.toString());
    } catch {
        return null;
    }
}

function toNumber(value: DecimalLike | number | null | undefined): number | null {
    return toDecimal(value)?.toNumber() ?? null;
}

function parseLeadTimeDays(value: string | null | undefined): number | null {
    if (!value) return null;
    const match = value.match(/\d+/);
    if (!match) return null;
    const numericValue = Number(match[0]);
    return Number.isFinite(numericValue) ? numericValue : null;
}

function getMedian(values: Decimal[]): Decimal | null {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a.comparedTo(b));
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) return sorted[middle] ?? null;

    const lower = sorted[middle - 1];
    const upper = sorted[middle];
    if (lower == null || upper == null) return null;
    return lower.plus(upper).dividedBy(2);
}

export function buildRfqBidComparison(rfq: RfqBidComparisonInput): RfqBidComparison {
    const submittedQuotes = rfq.vendorQuotes.filter(
        (quote) => quote.hasSubmittedQuote && quote.quotedAmount !== null
    );
    const quoteTotals = submittedQuotes
        .map((quote) => toDecimal(quote.quotedAmount))
        .filter((value): value is Decimal => value !== null);
    const lowestQuote = quoteTotals.length ? Decimal.min(...quoteTotals).toNumber() : null;
    const highestQuote = quoteTotals.length ? Decimal.max(...quoteTotals).toNumber() : null;
    const averageQuote = quoteTotals.length
        ? quoteTotals
              .reduce((sum, value) => sum.plus(value), new Decimal(0))
              .dividedBy(quoteTotals.length)
              .toNumber()
        : null;

    return {
        rfq: {
            rfqNumber: rfq.rfqNumber,
            title: rfq.title,
            estimatedBudget: null,
            bidDeadline: rfq.bidDeadline,
            status: { id: rfq.status, name: rfq.status, label: rfq.status },
        },
        deliverables: rfq.rfqdeliverables.map((deliverable, index) => ({
            id: deliverable.id,
            sequenceNumber: index + 1,
            description: deliverable.name,
            quantity: toNumber(deliverable.quantity) ?? 0,
            unit: deliverable.unit.label,
            estimatedUnitPrice: null,
            estimatedTotal: null,
        })),
        quotes: submittedQuotes.map((quote) => {
            const quotedAmount = toNumber(quote.quotedAmount) ?? 0;
            const status = quote.isAwarded
                ? { id: 'AWARDED', name: 'AWARDED', label: 'Awarded' }
                : { id: 'QUOTED', name: 'QUOTED', label: 'Quoted' };

            return {
                quoteId: quote.id,
                vendorId: quote.vendorId,
                vendorName: quote.vendor.name,
                status,
                totalAmount: quotedAmount,
                taxAmount: null,
                grandTotal: quotedAmount,
                leadTimeDays: parseLeadTimeDays(quote.leadTime),
                warrantyPeriod: null,
                isResponsive: null,
                attachments: quote.attachments
                    .filter((attachment) => !attachment.document.deletedAt)
                    .map((attachment) => ({
                        id: attachment.id,
                        documentId: attachment.documentId,
                        document: {
                            id: attachment.document.id,
                            name:
                                attachment.document.displayName ||
                                attachment.document.name ||
                                attachment.document.id,
                            ...(attachment.document.mimeType
                                ? { mimeType: attachment.document.mimeType }
                                : {}),
                        },
                    })),
                lineItems: [],
            };
        }),
        statistics: {
            lowestQuote,
            highestQuote,
            averageQuote,
            medianQuote: getMedian(quoteTotals)?.toNumber() ?? null,
            quotesSubmitted: submittedQuotes.length,
            quotesExpected: rfq.vendorQuotes.length,
            budgetVariance: null,
        },
    };
}
