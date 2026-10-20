import { useId } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { toDateOnly } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';

import {
  CardDateField,
  CardFieldRow,
  CardFields,
  CardReadOnlyField,
  CardTextField,
} from './agent-fields';
import {
  recordLineSubtotal,
  type CreatePoRecordAction,
  type CreateRfqRecordAction,
  type CreateScoRecordAction,
} from './record-actions';
import { RecordLineEditor } from './record-line-editor';
import { RecordRfqSelect } from './record-rfq-select';
import { withChangeType, withPurchaseOrder } from './record-sco-edits';
import { RecordScoChangeTypeSelect, RecordScoPoSelect } from './record-sco-selects';

/**
 * Create RFQ. Title, date and each deliverable's name and quantity are the
 * user's to correct; project and type were resolved to ids, so they show.
 */
export function CreateRfqFields({
  action,
  editable,
  onChange,
}: {
  action: CreateRfqRecordAction;
  editable: boolean;
  onChange: (action: CreateRfqRecordAction) => void;
}) {
  return (
    <CardFields>
      <CardTextField
        label="Title"
        value={action.title}
        editable={editable}
        onChange={(title) => onChange({ ...action, title })}
      />
      <CardFieldRow>
        <CardReadOnlyField label="Project">{action.projectName}</CardReadOnlyField>
        <CardReadOnlyField label="Type">{action.typeLabel}</CardReadOnlyField>
      </CardFieldRow>
      <CardDateField
        label="RFQ date"
        value={toDateOnly(action.rfqDate) ?? ''}
        editable={editable}
        onChange={(rfqDate) => onChange({ ...action, rfqDate })}
      />
      <RecordLineEditor
        label="Deliverables"
        editable={editable}
        showPrice={false}
        // No cost code here: an RFQ only asks vendors for prices. Codes are
        // set on the PO, where every line must carry one.
        lines={action.deliverables.map((deliverable) => ({
          description: deliverable.name,
          quantity: deliverable.quantity,
          unitLabel: deliverable.unitLabel,
        }))}
        onLineChange={(index, patch) =>
          onChange({
            ...action,
            deliverables: action.deliverables.map((deliverable, i) =>
              i === index
                ? {
                    ...deliverable,
                    name: patch.description ?? deliverable.name,
                    quantity: patch.quantity ?? deliverable.quantity,
                  }
                : deliverable
            ),
          })
        }
      />
    </CardFields>
  );
}

/**
 * Create PO. Vendor, project and trade are ids Elliot matched, so they show;
 * the RFQ and each line's cost code go through pickers that set the id. Terms,
 * delivery date and every line's description, quantity and rate are editable,
 * and the subtotal follows them.
 */
export function CreatePoFields({
  action,
  editable,
  onChange,
}: {
  action: CreatePoRecordAction;
  editable: boolean;
  onChange: (action: CreatePoRecordAction) => void;
}) {
  return (
    <CardFields>
      <CardFieldRow>
        <CardReadOnlyField label="Vendor">{action.vendorName}</CardReadOnlyField>
        <RecordRfqSelect
          projectId={action.projectId}
          rfqId={action.rfqId ?? null}
          rfqNumber={action.rfqNumber ?? null}
          disabled={!editable}
          onChange={({ rfqId, rfqNumber }) =>
            onChange({
              ...action,
              rfqId,
              rfqNumber,
              // Lines Elliot tied to the old RFQ's deliverables no longer
              // belong to it; they stay on the PO as plain lines.
              lineItems:
                rfqId === action.rfqId
                  ? action.lineItems
                  : action.lineItems.map((line) => ({ ...line, rfqDeliverableId: null })),
            })
          }
        />
      </CardFieldRow>
      <CardReadOnlyField label="Project">{action.projectName}</CardReadOnlyField>
      <CardFieldRow>
        <CardReadOnlyField label="Trade">{action.tradeCategoryLabel}</CardReadOnlyField>
        <PaymentTermsField
          value={action.paymentTerms ?? null}
          editable={editable}
          onChange={(paymentTerms) => onChange({ ...action, paymentTerms })}
        />
      </CardFieldRow>
      <CardDateField
        label="Expected delivery"
        value={toDateOnly(action.expectedDate) ?? ''}
        editable={editable}
        onChange={(expectedDate) => onChange({ ...action, expectedDate: expectedDate || null })}
      />
      <RecordLineEditor
        label="Line items"
        editable={editable}
        showPrice
        costCodes={{ projectId: action.projectId, required: true }}
        lines={action.lineItems}
        onLineChange={(index, { costCodeId, costCodeLabel, ...patch }) =>
          onChange({
            ...action,
            lineItems: action.lineItems.map((line, i) =>
              i === index
                ? {
                    ...line,
                    ...patch,
                    // The select never clears a required code, so null is not
                    // written over a PO line.
                    ...(costCodeId && costCodeLabel ? { costCodeId, costCodeLabel } : {}),
                  }
                : line
            ),
          })
        }
        footer={
          <span className="flex justify-between font-semibold">
            <span>Subtotal, before tax and fees</span>
            <span className="tabular-nums">{formatCurrency(recordLineSubtotal(action))}</span>
          </span>
        }
      />
      {action.issue ? (
        <p className="text-xs text-muted-foreground">
          The PO is marked issued once it is created. The vendor is not emailed.
        </p>
      ) : null}
    </CardFields>
  );
}

type PaymentTerms = NonNullable<CreatePoRecordAction['paymentTerms']>;

function PaymentTermsField({
  value,
  editable,
  onChange,
}: {
  value: PaymentTerms | null;
  editable: boolean;
  onChange: (value: PaymentTerms) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Payment terms
      </label>
      <Select
        value={value ?? undefined}
        disabled={!editable}
        onValueChange={(next) => {
          const option = PAYMENT_TERMS_OPTIONS.find((candidate) => candidate.value === next);
          if (option) onChange(option.value);
        }}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_TERMS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Create change order. Title, date, the PO, the change type and every line's
 * description, quantity and rate are the user's to correct (elli-ui#1485). The
 * vendor follows the PO — a change order is against a PO, and its vendor is
 * that PO's — so picking another PO brings its vendor.
 */
export function CreateScoFields({
  action,
  editable,
  onChange,
}: {
  action: CreateScoRecordAction;
  editable: boolean;
  onChange: (action: CreateScoRecordAction) => void;
}) {
  return (
    <CardFields>
      <CardTextField
        label="Title"
        value={action.title}
        editable={editable}
        onChange={(title) => onChange({ ...action, title })}
      />
      {/* The PO has the full width to itself: its list shows each PO's vendor
          and total, which a half-width dropdown cut off. */}
      <RecordScoPoSelect
        projectId={action.projectId}
        purchaseOrderId={action.purchaseOrderId}
        poNumber={action.poNumber}
        disabled={!editable}
        onChange={(po) => onChange(withPurchaseOrder(action, po))}
      />
      <CardFieldRow>
        <CardReadOnlyField label="Vendor">{action.vendorName}</CardReadOnlyField>
        <RecordScoChangeTypeSelect
          changeTypeId={action.changeTypeId}
          changeTypeLabel={action.changeTypeLabel}
          disabled={!editable}
          onChange={(changeType) => onChange(withChangeType(action, changeType))}
        />
      </CardFieldRow>
      <CardDateField
        label="Date"
        value={toDateOnly(action.date) ?? ''}
        editable={editable}
        onChange={(date) => onChange({ ...action, date })}
      />
      <RecordLineEditor
        label="Line items"
        editable={editable}
        showPrice
        lines={action.lineItems}
        onLineChange={(index, patch) =>
          onChange({
            ...action,
            lineItems: action.lineItems.map((line, i) =>
              i === index
                ? {
                    ...line,
                    description: patch.description ?? line.description,
                    quantity: patch.quantity ?? line.quantity,
                    unitPrice: patch.unitPrice ?? line.unitPrice,
                  }
                : line
            ),
          })
        }
        footer={
          <span className="flex justify-between font-semibold">
            <span>Subtotal, before tax and fees</span>
            <span className="tabular-nums">{formatCurrency(recordLineSubtotal(action))}</span>
          </span>
        }
      />
    </CardFields>
  );
}
