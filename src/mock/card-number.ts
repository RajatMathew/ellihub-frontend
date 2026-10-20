/** A typed number from a card input; blank or unreadable reads as 0. */
export function parseCardNumber(raw: string): number {
  const value = Number(raw.replace(/,/g, ''));
  return Number.isFinite(value) ? value : 0;
}
