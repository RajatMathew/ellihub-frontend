import { Prisma } from '@db/client';
import { describe, expect, test } from 'bun:test';

import { buildRfqBidComparison } from './bid-comparison';

const document = {
    id: 'doc-1',
    name: 'quote.pdf',
    displayName: null,
    mimeType: 'application/pdf',
    deletedAt: null,
};

describe('RFQ bid comparison decimal output', () => {
    test('converts decimal quantities and quote amounts into comparison data', () => {
        const bidDeadline = new Date('2026-07-01T00:00:00.000Z');

        const comparison = buildRfqBidComparison({
            rfqNumber: 'RFQ-2026-0101',
            title: 'Masonry repairs',
            bidDeadline,
            status: 'PUBLISHED',
            rfqdeliverables: [
                {
                    id: 'deliverable-1',
                    name: 'Brick replacement',
                    quantity: new Prisma.Decimal('12.75'),
                    unit: { label: 'SF' },
                },
                {
                    id: 'deliverable-2',
                    name: 'Mortar patching',
                    quantity: new Prisma.Decimal('3.50'),
                    unit: { label: 'EA' },
                },
            ],
            vendorQuotes: [
                {
                    id: 'quote-1',
                    vendorId: 'vendor-1',
                    vendor: { name: 'Alpha Masonry' },
                    hasSubmittedQuote: true,
                    quotedAmount: new Prisma.Decimal('100.25'),
                    isAwarded: false,
                    leadTime: '10 business days',
                    attachments: [
                        { id: 'attachment-1', documentId: 'doc-1', document },
                        {
                            id: 'attachment-2',
                            documentId: 'doc-2',
                            document: { ...document, id: 'doc-2', deletedAt: new Date() },
                        },
                    ],
                },
                {
                    id: 'quote-2',
                    vendorId: 'vendor-2',
                    vendor: { name: 'Beta Restoration' },
                    hasSubmittedQuote: true,
                    quotedAmount: new Prisma.Decimal('200.75'),
                    isAwarded: true,
                    leadTime: '2 weeks',
                    attachments: [],
                },
                {
                    id: 'quote-3',
                    vendorId: 'vendor-3',
                    vendor: { name: 'Pending Vendor' },
                    hasSubmittedQuote: false,
                    quotedAmount: null,
                    isAwarded: false,
                    leadTime: null,
                    attachments: [],
                },
            ],
        });

        expect(comparison.deliverables).toEqual([
            expect.objectContaining({ id: 'deliverable-1', quantity: 12.75, unit: 'SF' }),
            expect.objectContaining({ id: 'deliverable-2', quantity: 3.5, unit: 'EA' }),
        ]);
        expect(comparison.quotes).toEqual([
            expect.objectContaining({
                quoteId: 'quote-1',
                totalAmount: 100.25,
                grandTotal: 100.25,
                leadTimeDays: 10,
                attachments: [
                    {
                        id: 'attachment-1',
                        documentId: 'doc-1',
                        document: { id: 'doc-1', name: 'quote.pdf', mimeType: 'application/pdf' },
                    },
                ],
            }),
            expect.objectContaining({
                quoteId: 'quote-2',
                status: { id: 'AWARDED', name: 'AWARDED', label: 'Awarded' },
                totalAmount: 200.75,
                grandTotal: 200.75,
            }),
        ]);
        expect(comparison.statistics).toEqual({
            lowestQuote: 100.25,
            highestQuote: 200.75,
            averageQuote: 150.5,
            medianQuote: 150.5,
            quotesSubmitted: 2,
            quotesExpected: 3,
            budgetVariance: null,
        });
    });

    test('calculates quote statistics without JavaScript floating point drift', () => {
        const comparison = buildRfqBidComparison({
            rfqNumber: 'RFQ-2026-0102',
            title: 'Precision quotes',
            bidDeadline: new Date('2026-07-02T00:00:00.000Z'),
            status: 'PUBLISHED',
            rfqdeliverables: [
                {
                    id: 'deliverable-1',
                    name: 'Small quantity',
                    quantity: new Prisma.Decimal('0.10'),
                    unit: { label: 'EA' },
                },
            ],
            vendorQuotes: [
                {
                    id: 'quote-1',
                    vendorId: 'vendor-1',
                    vendor: { name: 'Alpha' },
                    hasSubmittedQuote: true,
                    quotedAmount: new Prisma.Decimal('0.10'),
                    isAwarded: false,
                    leadTime: null,
                    attachments: [],
                },
                {
                    id: 'quote-2',
                    vendorId: 'vendor-2',
                    vendor: { name: 'Beta' },
                    hasSubmittedQuote: true,
                    quotedAmount: new Prisma.Decimal('0.20'),
                    isAwarded: false,
                    leadTime: null,
                    attachments: [],
                },
            ],
        });

        expect(comparison.statistics.averageQuote).toBe(0.15);
        expect(comparison.statistics.medianQuote).toBe(0.15);
    });
});
