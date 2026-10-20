import { describe, expect, test } from 'bun:test';

import { vendorSchema } from '../src/modules/directory/schemas/vendor.schema';
import { feedbackDetailSchema } from '../src/modules/feedback/schemas/feedback.schema';
import { projectDetailSchema } from '../src/modules/project/schemas/project.schema';

/**
 * Read schemas that lean on Zod's default handling, pinned across Zod upgrades.
 *
 * Pages read these fields without a guard: `capabilities.actions.invoice.create`
 * on a project, `totalCommitted` or `_count.invoices` on a vendor. They exist
 * because the schema fills them in when the API leaves them out, and Zod has
 * changed how `prefault`, nested defaults and `.merge()` build that output
 * between minor versions (4.4 and 4.6.2 both did).
 */
describe('project capabilities', () => {
  const base = { id: 'p1', name: 'Project', description: '', stageId: 's1', gcId: 'g1' };

  test('an absent capabilities block becomes the fully defaulted one', () => {
    const project = projectDetailSchema.parse(base);

    expect(project.capabilities).toMatchObject({
      canManage: false,
      canEdit: false,
      canCreateProjectDocuments: false,
      canManageTeam: false,
      canManageSchedule: false,
    });
    expect(project.capabilities.actions.invoice).toEqual({});
    expect(project.capabilities.actions.primeContract).toEqual({});
  });

  test('flags the API sends are kept and the rest still default', () => {
    const project = projectDetailSchema.parse({
      ...base,
      capabilities: { canEdit: true, actions: { invoice: { create: true } } },
    });

    expect(project.capabilities.canEdit).toBe(true);
    expect(project.capabilities.canManage).toBe(false);
    expect(project.capabilities.actions.invoice).toEqual({ create: true });
    expect(project.capabilities.actions.rfq).toEqual({});
  });
});

describe('vendor list row', () => {
  const row = { id: 'v1', name: 'Vendor', status: 'ACTIVE' };

  test('metrics merged into the row default to zero and coerce decimal strings', () => {
    expect(vendorSchema.parse(row)).toMatchObject({ totalCommitted: 0, invoiceCount: 0 });
    expect(vendorSchema.parse({ ...row, totalCommitted: '1250.50' }).totalCommitted).toBe(1250.5);
  });

  test('an absent _count becomes zero counts, and unknown fields pass through', () => {
    const vendor = vendorSchema.parse({ ...row, extra: 'kept' });

    expect(vendor._count).toEqual({
      contactLinks: 0,
      contacts: 0,
      documents: 0,
      purchaseOrders: 0,
      invoices: 0,
    });
    expect(vendor).toMatchObject({ extra: 'kept' });
  });
});

describe('feedback detail', () => {
  test('nested content blocks parse at depth', () => {
    const block = (id: string, children?: object[]) => ({ id, type: 'text', text: id, children });
    const content = [block('a', [block('b', [block('c', [block('d')])])])];

    const detail = feedbackDetailSchema.parse({
      id: 'f1',
      title: 'Feedback',
      status: 'open',
      content,
      attachments: [],
    });

    expect(detail.content[0].children?.[0].children?.[0].children?.[0].id).toBe('d');
  });
});
