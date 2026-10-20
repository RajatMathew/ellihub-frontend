import Decimal from 'decimal.js';
import { z } from 'zod';

function maxDecimalPlaces(schema: z.ZodNumber, places: number, fieldName: string) {
  return schema.refine((value) => new Decimal(value.toString()).decimalPlaces() <= places, {
    message: `${fieldName} cannot exceed ${places} decimal places`,
  });
}

export const quantitySchema = (fieldName = 'Quantity') =>
  maxDecimalPlaces(z.number().positive(`${fieldName} must be > 0`), 3, fieldName);

// Four places: vendors quote unit prices such as 4.8507, and a line priced at
// fewer would not total to the quote.
export const rateSchema = (fieldName = 'Unit price') =>
  maxDecimalPlaces(z.number().min(0, `${fieldName} must be >= 0`), 4, fieldName);

/**
 * A PO or SCO line's unit price. The form starts it blank rather than at 0, so
 * nobody sends a vendor a free line by not filling it in; it must be entered
 * before saving, and 0 is a price.
 */
export const lineUnitPriceSchema = (fieldName = 'Unit price') =>
  rateSchema(fieldName)
    .optional()
    .refine((value) => value !== undefined, `${fieldName} is required`);

export const moneySchema = (fieldName: string) =>
  maxDecimalPlaces(z.number().min(0, `${fieldName} must be >= 0`), 2, fieldName);

export const percentSchema = (fieldName: string) =>
  maxDecimalPlaces(z.number().min(0).max(100), 3, fieldName);
