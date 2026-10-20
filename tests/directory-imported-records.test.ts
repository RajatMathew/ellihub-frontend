import { describe, expect, test } from 'bun:test';

import { describeImportSource } from '../src/app/lib/import-source';
import {
  generalContractorDetailSchema,
  generalContractorSchema,
} from '../src/modules/directory/schemas/gc.schema';
import { vendorDetailSchema, vendorSchema } from '../src/modules/directory/schemas/vendor.schema';

/**
 * A vendor or GC the migration's reference import made carries `importSource`,
 * which names the helper export it came from and has no sheet or row. The
 * schemas must keep it - Zod drops a key it does not know, and the "Imported"
 * badge and Source panel would silently never show.
 */
const importSource = {
  fileName: 'prod2.dump',
  fileId: null,
  sheet: null,
  row: null,
  legacyNumber: null,
  importedAt: '2026-10-10T12:00:00.000Z',
  importedBy: { id: 'user0001', name: 'Fayis' },
  details: [{ label: 'GC type', value: 'SCA, from its projects’ division', kind: 'text' }],
};

const vendor = {
  id: 'vend0001',
  name: 'Atlantic Plywood',
  status: 'ACTIVE',
  paymentTerms: 'NET_30',
};
const gc = {
  id: 'gcon0001',
  name: 'Citnalta Construction Corp.',
  status: 'ACTIVE',
  paymentTerms: 'NET_30',
};

describe('an imported vendor or GC', () => {
  test('keeps where it came from, in the list and on its page', () => {
    for (const schema of [vendorSchema, vendorDetailSchema]) {
      expect(schema.parse({ ...vendor, importSource }).importSource).toMatchObject({
        fileName: 'prod2.dump',
        sheet: null,
      });
    }
    for (const schema of [generalContractorSchema, generalContractorDetailSchema]) {
      expect(schema.parse({ ...gc, importSource }).importSource).toMatchObject({
        fileName: 'prod2.dump',
        details: importSource.details,
      });
    }
  });

  test('reads as a record from an API that does not send the field yet', () => {
    expect(vendorSchema.parse(vendor).importSource).toBeUndefined();
    expect(generalContractorSchema.parse({ ...gc, importSource: null }).importSource).toBeNull();
  });

  test('is described by the export alone, with no sheet to name', () => {
    expect(describeImportSource(importSource)).toBe('prod2.dump');
  });
});
