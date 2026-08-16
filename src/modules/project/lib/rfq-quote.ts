import type { RFQDetail, RFQQuote } from '@/modules/project/schemas/rfq';

type AwardedRFQQuoteSource = Pick<RFQDetail, 'awardedVendorId' | 'quotes'>;

export function getAwardedRFQQuote(rfq: AwardedRFQQuoteSource): RFQQuote | undefined {
  const explicitlyAwardedQuote = rfq.quotes.find((quote) => quote.isAwarded);
  if (explicitlyAwardedQuote || !rfq.awardedVendorId) return explicitlyAwardedQuote;

  return rfq.quotes.find((quote) => quote.vendorId === rfq.awardedVendorId);
}

export function getRFQQuoteLeadTime(quote: RFQQuote): string | null {
  if (quote.leadTimeDays != null) return String(quote.leadTimeDays);

  const leadTime = quote.leadTime?.trim();
  if (leadTime) return leadTime;

  return null;
}
