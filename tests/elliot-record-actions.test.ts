import { describe, expect, test } from 'bun:test';

import {
  isRecordActionReady,
  recordActionAttachments,
  recordActionBlocker,
  recordLineSubtotal,
  toCreateInvoiceInput,
  toCreatePoInput,
  toCreateRfqInput,
  toCreateScoInput,
  type AwardRfqRecordAction,
  type CreatePoRecordAction,
  type CreateRfqRecordAction,
  type CreateScoRecordAction,
  type LogInvoiceRecordAction,
  type RecordAttachment,
} from '../src/mock/record-actions';

// Elliot's record proposals: what the approval card lets through, and what it
// sends to the same create routes the RFQ, PO and invoice pages use.

const emailFile: RecordAttachment = {
  source: 'email_attachment',
  messageId: 'Msg00001',
  attachmentId: 'Att00001',
  attachmentName: 'invoice-4471.pdf',
};

const po: CreatePoRecordAction = {
  action: 'create_po',
  projectId: 'Prj00001',
  projectName: 'Harbor Point',
  vendorId: 'Vnd00001',
  vendorName: 'Atlantic Plywood',
  rfqId: null,
  rfqNumber: null,
  tradeCategoryId: 'Trd00001',
  tradeCategoryLabel: 'Carpentry',
  paymentTerms: 'NET_30',
  lineItems: [
    {
      rfqDeliverableId: null,
      description: '3/4" plywood',
      quantity: 40,
      unitId: 'Unt00001',
      unitLabel: 'Sheet',
      unitPrice: 52.5,
      costCodeId: 'Cc000001',
      costCodeLabel: '06-100 - Rough Carpentry',
    },
  ],
  issue: true,
  summary: 'PO to Atlantic Plywood',
};

const invoice: LogInvoiceRecordAction = {
  action: 'log_invoice',
  projectId: 'Prj00001',
  vendorId: 'Vnd00001',
  vendorName: 'Atlantic Plywood',
  purchaseOrderId: 'Po000001',
  poNumber: 'PO-1042',
  externalInvoiceNumber: 'INV-4471',
  invoiceDate: '2026-10-01',
  dueDate: '2026-10-31',
  totalAmount: 2100,
  attachment: emailFile,
  summary: 'Log INV-4471',
};

const sco: CreateScoRecordAction = {
  action: 'create_sco',
  projectId: 'Prj00001',
  purchaseOrderId: 'Po000001',
  poNumber: 'PO-1042',
  vendorName: 'Atlantic Plywood',
  date: '2026-10-05',
  title: 'Extra plywood',
  changeTypeId: 'Cht00001',
  changeTypeLabel: 'Addition',
  lineItems: [
    {
      description: 'Plywood',
      quantity: 10,
      unitId: 'Unt00001',
      unitLabel: 'Sheet',
      unitPrice: 52.5,
    },
  ],
  summary: 'Change order on PO-1042',
};

const award: AwardRfqRecordAction = {
  action: 'award_rfq',
  rfqId: 'Rfq00001',
  rfqNumber: 'RFQ-1',
  quoteId: 'Quo00001',
  vendorName: 'Atlantic Plywood',
  quotedAmount: 2400,
  negotiationAmount: null,
  summary: 'Award',
};

describe('a record card while the proposal is still streaming in', () => {
  test('waits for the fields its variant reads', () => {
    expect(isRecordActionReady(undefined)).toBe(false);
    expect(isRecordActionReady({ action: 'create_po', summary: 'PO' })).toBe(false);
    expect(isRecordActionReady({ action: 'award_rfq', summary: 'Award', rfqId: 'Rfq00001' })).toBe(
      false
    );
  });

  test('renders once they are there', () => {
    expect(isRecordActionReady(po)).toBe(true);
    expect(isRecordActionReady(invoice)).toBe(true);
  });
});

describe('what keeps Submit disabled', () => {
  test('an invoice without its file, which the invoice API refuses', () => {
    expect(recordActionBlocker({ ...invoice, attachment: null })).toBe(
      'Attach the invoice before logging it.'
    );
  });

  test('an invoice Elliot proposed before it read the amount', () => {
    expect(recordActionBlocker({ ...invoice, totalAmount: null })).toBe(
      'Enter an invoice amount above 0.'
    );
  });

  test('a PO line with no quantity', () => {
    const line = { ...po.lineItems[0]!, quantity: 0 };

    expect(recordActionBlocker({ ...po, lineItems: [line] })).toBe(
      'Every line needs a quantity above 0.'
    );
  });

  test('a PO line Elliot could not match to a cost code', () => {
    const line = { ...po.lineItems[0]!, costCodeId: '' };

    expect(recordActionBlocker({ ...po, lineItems: [line] })).toBe('Every line needs a cost code.');
  });

  test('a PO line whose description was cleared on the card', () => {
    const line = { ...po.lineItems[0]!, description: '  ' };

    expect(recordActionBlocker({ ...po, lineItems: [line] })).toBe(
      'Every line needs a description.'
    );
  });

  test('an RFQ edited on the card into something the API would reject', () => {
    const rfq: CreateRfqRecordAction = {
      action: 'create_rfq',
      projectId: 'Prj00001',
      projectName: 'Harbor Point',
      title: 'Rough carpentry materials',
      rfqDate: '2026-10-15',
      typeId: 'Trd00001',
      typeLabel: 'Carpentry',
      deliverables: [{ name: 'Plywood', quantity: 40, unitId: 'Unt00001', unitLabel: 'Sheet' }],
      summary: 'RFQ',
    };
    const plywood = rfq.deliverables[0]!;

    expect(recordActionBlocker(rfq)).toBeNull();
    expect(recordActionBlocker({ ...rfq, title: ' ' })).toBe('Give the RFQ a title.');
    expect(recordActionBlocker({ ...rfq, rfqDate: '' })).toBe('Pick an RFQ date.');
    expect(recordActionBlocker({ ...rfq, deliverables: [{ ...plywood, name: '' }] })).toBe(
      'Every deliverable needs a name.'
    );
    expect(recordActionBlocker({ ...rfq, deliverables: [{ ...plywood, quantity: 0 }] })).toBe(
      'Every deliverable needs a quantity above 0.'
    );
  });

  test('nothing, once everything is there', () => {
    expect(recordActionBlocker(po)).toBeNull();
    expect(recordActionBlocker(invoice)).toBeNull();
  });
});

describe('what is sent to the create routes', () => {
  test('a PO leaves out what only the card shows, and never sends a null id', () => {
    const input = toCreatePoInput(po);

    expect(input.rfqId).toBeUndefined();
    expect(input.lineItems[0]).toEqual({
      rfqDeliverableId: undefined,
      description: '3/4" plywood',
      quantity: 40,
      unitId: 'Unt00001',
      unitPrice: 52.5,
      costCodeId: 'Cc000001',
    });
    expect(input).not.toHaveProperty('issue');
    expect(input).not.toHaveProperty('vendorName');
  });

  test('an RFQ with no description falls back to its title, which the API accepts', () => {
    const rfq: CreateRfqRecordAction = {
      action: 'create_rfq',
      projectId: 'Prj00001',
      projectName: 'Harbor Point',
      title: 'Rough carpentry materials',
      description: '  ',
      rfqDate: '2026-10-15',
      typeId: 'Trd00001',
      typeLabel: 'Carpentry',
      deliverables: [
        { name: 'Plywood', quantity: 40, unitId: 'Unt00001', unitLabel: 'Sheet', costCodeId: null },
      ],
      summary: 'RFQ',
    };

    const input = toCreateRfqInput(rfq);

    expect(input.description).toBe('Rough carpentry materials');
    expect(input.deliverables[0]).toMatchObject({ name: 'Plywood', description: 'Plywood' });
    expect(input.deliverables[0]!.costCodeId).toBeUndefined();
  });

  test('an invoice carries its uploaded file and is never a vendor coupon', () => {
    const input = toCreateInvoiceInput({ ...invoice, externalInvoiceNumber: '' }, ['Fil00001']);

    expect(input.attachments).toEqual(['Fil00001']);
    expect(input.vendorCoupon).toBe(false);
    expect(input.externalInvoiceNumber).toBeNull();
    expect(input.taxAmount).toBe(0);
  });
});

// Fields the card lets the user correct: each edit must be what the API gets,
// and an edit the API would refuse must hold Submit back.
describe('fields corrected on the card', () => {
  test("an invoice sends the number and dates typed over Elliot's reading", () => {
    const input = toCreateInvoiceInput(
      {
        ...invoice,
        externalInvoiceNumber: 'INV-4471-A',
        invoiceDate: '2026-10-07',
        dueDate: '2026-11-06',
      },
      ['Fil00001']
    );

    expect(input).toMatchObject({
      externalInvoiceNumber: 'INV-4471-A',
      invoiceDate: '2026-10-07',
      dueDate: '2026-11-06',
    });
  });

  test('an invoice with a date cleared on the card cannot be logged', () => {
    expect(recordActionBlocker({ ...invoice, invoiceDate: '' })).toBe('Pick the invoice date.');
    expect(recordActionBlocker({ ...invoice, dueDate: '' })).toBe('Pick the due date.');
  });

  test('a change order sends its edited title, date and lines', () => {
    const edited: CreateScoRecordAction = {
      ...sco,
      title: 'Extra plywood, level 3',
      date: '2026-10-09',
      lineItems: [{ ...sco.lineItems[0]!, quantity: 12, unitPrice: 49 }],
    };

    const input = toCreateScoInput(edited);

    expect(input.title).toBe('Extra plywood, level 3');
    expect(input.date).toBe('2026-10-09');
    expect(input.lineItems[0]).toMatchObject({ quantity: 12, unitPrice: 49 });
    expect(recordActionBlocker(edited)).toBeNull();
  });

  test('a change order edited into one the API would refuse is held back', () => {
    expect(recordActionBlocker({ ...sco, title: '  ' })).toBe('Give the change order a title.');
    expect(recordActionBlocker({ ...sco, date: '' })).toBe('Pick a change order date.');
    expect(
      recordActionBlocker({ ...sco, lineItems: [{ ...sco.lineItems[0]!, quantity: 0 }] })
    ).toBe('Every line needs a quantity above 0.');
  });

  test('an award takes a blank negotiated amount, but not a zero one', () => {
    expect(recordActionBlocker(award)).toBeNull();
    expect(recordActionBlocker({ ...award, negotiationAmount: 2250 })).toBeNull();
    expect(recordActionBlocker({ ...award, negotiationAmount: 0 })).toBe(
      'Enter a negotiated amount above 0, or leave it blank.'
    );
  });

  test('a PO sends the payment terms picked on the card', () => {
    expect(toCreatePoInput({ ...po, paymentTerms: 'NET_60' }).paymentTerms).toBe('NET_60');
  });
});

describe('the figures the card shows', () => {
  test('the subtotal is summed in decimals, not floats', () => {
    const lines = [
      { ...po.lineItems[0]!, quantity: 3, unitPrice: 0.1 },
      { ...po.lineItems[0]!, quantity: 3, unitPrice: 19.99 },
    ];

    // 0.1 * 3 in floats is 0.30000000000000004.
    expect(recordLineSubtotal({ ...po, lineItems: lines })).toBe('60.27');
  });

  test('an award carries no files; a PO carries the one it was given', () => {
    expect(
      recordActionAttachments({
        action: 'award_rfq',
        rfqId: 'Rfq00001',
        rfqNumber: 'RFQ-1',
        quoteId: 'Quo00001',
        vendorName: 'Atlantic Plywood',
        summary: 'Award',
      })
    ).toEqual([]);
    expect(recordActionAttachments({ ...po, attachment: emailFile })).toEqual([emailFile]);
    expect(recordActionAttachments({ ...po, attachment: null })).toEqual([]);
  });
});
