import Decimal from 'decimal.js';
import { z } from 'zod';

function maxDecimalPlaces(schema: z.ZodNumber, places: number, fieldName: string) {
  return schema.refine((value) => new Decimal(value.toString()).decimalPlaces() <= places, {
    message: `${fieldName} cannot exceed ${places} decimal places`,
  });
}

export const quantitySchema = (fieldName = 'Quantity') =>
  maxDecimalPlaces(z.number().positive(`${fieldName} must be > 0`), 3, fieldName);

export const rateSchema = (fieldName = 'Unit price') =>
  maxDecimalPlaces(z.number().min(0, `${fieldName} must be >= 0`), 3, fieldName);

export const moneySchema = (fieldName: string) =>
  maxDecimalPlaces(z.number().min(0, `${fieldName} must be >= 0`), 2, fieldName);

export const percentSchema = (fieldName: string) =>
  maxDecimalPlaces(z.number().min(0).max(100), 3, fieldName);
