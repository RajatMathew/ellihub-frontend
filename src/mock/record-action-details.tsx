import { toDateOnly } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';

import {
  CardDateField,
  CardFieldRow,
  CardFields,
  CardReadOnlyField,
  CardTextField,
} from './agent-fields';
import { parseCardNumber } from './card-number';
import { type RecordAgentAction } from './record-actions';
import { CreatePoFields, CreateRfqFields, CreateScoFields } from './record-create-fields';

/** The facts a reviewer needs to approve a record, laid out per record type. */
export function RecordActionDetails({
  action,
  editable,
  onChange,
}: {
  action: RecordAgentAction;
  editable: boolean;
  onChange: (action: RecordAgentAction) => void;
}) {
  switch (action.action) {
    case 'create_rfq':
      return <CreateRfqFields action={action} editable={editable} onChange={onChange} />;
    case 'create_po':
      return <CreatePoFields action={action} editable={editable} onChange={onChange} />;
    case 'award_rfq':
      return (
        <CardFields>
          <CardFieldRow>
            <CardReadOnlyField label="RFQ">{action.rfqNumber}</CardReadOnlyField>
            <CardReadOnlyField label="Vendor">{action.vendorName}</CardReadOnlyField>
          </CardFieldRow>
          <CardFieldRow>
            {/* Shown, not edited: the award sends the quote's id, not this figure. */}
            {action.quotedAmount != null ? (
              <CardReadOnlyField label="Quoted">
                {formatCurrency(action.quotedAmount)}
              </CardReadOnlyField>
            ) : null}
            <CardTextField
              label="Negotiated ($)"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={action.negotiationAmount != null ? String(action.negotiationAmount) : ''}
              editable={editable}
              onChange={(raw) =>
                onChange({ ...action, negotiationAmount: raw ? parseCardNumber(raw) : null })
              }
            />
          </CardFieldRow>
        </CardFields>
      );
    case 'create_sco':
      return <CreateScoFields action={action} editable={editable} onChange={onChange} />;
    case 'log_invoice':
      return (
        <CardFields>
          <CardFieldRow>
            <CardReadOnlyField label="PO">{action.poNumber}</CardReadOnlyField>
            <CardReadOnlyField label="Vendor">{action.vendorName}</CardReadOnlyField>
          </CardFieldRow>
          <CardFieldRow>
            <CardTextField
              label="Invoice #"
              value={action.externalInvoiceNumber ?? ''}
              editable={editable}
              onChange={(externalInvoiceNumber) => onChange({ ...action, externalInvoiceNumber })}
            />
            <CardTextField
              label="Amount ($)"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              required
              value={action.totalAmount != null ? String(action.totalAmount) : ''}
              editable={editable}
              onChange={(raw) =>
                onChange({ ...action, totalAmount: raw ? parseCardNumber(raw) : null })
              }
            />
          </CardFieldRow>
          <CardFieldRow>
            <CardDateField
              label="Invoice date"
              value={toDateOnly(action.invoiceDate) ?? ''}
              editable={editable}
              onChange={(invoiceDate) => onChange({ ...action, invoiceDate })}
            />
            <CardDateField
              label="Due"
              value={toDateOnly(action.dueDate) ?? ''}
              editable={editable}
              onChange={(dueDate) => onChange({ ...action, dueDate })}
            />
          </CardFieldRow>
        </CardFields>
      );
  }
}
