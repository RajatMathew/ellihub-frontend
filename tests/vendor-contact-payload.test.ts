import { describe, expect, test } from 'bun:test';

import { getVendorContactPayload } from '../src/modules/directory/lib/vendor-payload';
import {
  vendorFormSchema,
  type VendorFormValues,
} from '../src/modules/directory/schemas/vendor.schema';

const baseFormValues: VendorFormValues = {
  name: 'Acme Supply',
  email: '',
  type: 'type-1',
  status: 'ACTIVE',
  taxId: '',
  phone: '',
  address: '',
  website: '',
  paymentTerms: 'NET_30',
};

describe('getVendorContactPayload', () => {
  test('sends a blank cell phone and address as null so the API clears them', () => {
    expect(getVendorContactPayload({ phone: '', address: '   ' })).toEqual({
      phone: null,
      address: null,
    });
  });

  test('trims the cell phone and address it sends', () => {
    expect(
      getVendorContactPayload({ phone: ' (555) 010-0100 ', address: ' 200 Commerce St ' })
    ).toEqual({ phone: '(555) 010-0100', address: '200 Commerce St' });
  });
});

describe('vendorFormSchema cell phone', () => {
  test('accepts an empty cell phone, since the field is optional', () => {
    expect(vendorFormSchema.safeParse(baseFormValues).success).toBe(true);
  });

  test('rejects a cell phone with letters in it', () => {
    const result = vendorFormSchema.safeParse({ ...baseFormValues, phone: '555-CALL-NOW' });
    expect(result.success).toBe(false);
  });

  test('rejects a cell phone too short to dial', () => {
    const result = vendorFormSchema.safeParse({ ...baseFormValues, phone: '555-01' });
    expect(result.success).toBe(false);
  });

  test('keeps the address the user typed', () => {
    const result = vendorFormSchema.safeParse({
      ...baseFormValues,
      address: '200 Commerce St, Dallas TX 75201',
    });
    expect(result.success && result.data.address).toBe('200 Commerce St, Dallas TX 75201');
  });
});
