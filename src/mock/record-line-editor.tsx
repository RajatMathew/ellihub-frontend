import type { ReactNode } from 'react';

import { Input } from '@/app/components/ui/input';
import { formatCurrency } from '@/app/lib/helpers';

import { parseCardNumber } from './card-number';
import { RecordCostCodeSelect } from './record-cost-code-select';

export type EditorLine = {
  description: string;
  quantity: number;
  unitLabel: string;
  unitPrice?: number;
  costCodeId?: string | null;
  costCodeLabel?: string | null;
};

export type EditorLinePatch = Partial<
  Pick<EditorLine, 'description' | 'quantity' | 'unitPrice' | 'costCodeId' | 'costCodeLabel'>
>;

const CELL_INPUT = 'h-7 border-transparent px-1.5 text-xs shadow-none hover:border-input';

/**
 * RFQ deliverables and PO lines, as a compact table. Description, quantity,
 * rate and cost code are editable while the card waits; the unit was matched
 * by id against the catalog, so it is shown, not typed.
 */
export function RecordLineEditor({
  label,
  lines,
  editable,
  showPrice,
  costCodes,
  onLineChange,
  footer,
}: {
  label: string;
  lines: EditorLine[];
  editable: boolean;
  showPrice: boolean;
  /** Which project's cost codes a line can pick from, and whether it must. */
  costCodes?: { projectId: string; required: boolean };
  onLineChange: (index: number, patch: EditorLinePatch) => void;
  footer?: ReactNode;
}) {
  const columns = 3 + (showPrice ? 1 : 0) + (costCodes ? 1 : 0);
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="overflow-x-auto rounded-md border border-input">
        <table className="w-full min-w-80 border-collapse text-xs">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="w-2/5 px-2 py-1.5 text-left font-medium">Description</th>
              <th className="px-2 py-1.5 text-right font-medium">Qty</th>
              <th className="px-2 py-1.5 text-left font-medium">Unit</th>
              {showPrice ? <th className="px-2 py-1.5 text-right font-medium">Rate</th> : null}
              {costCodes ? <th className="px-2 py-1.5 text-left font-medium">Cost code</th> : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index} className="border-t border-border">
                <td className="p-1">
                  {editable ? (
                    <Input
                      aria-label={`Line ${index + 1} description`}
                      className={CELL_INPUT}
                      value={line.description}
                      onChange={(event) => onLineChange(index, { description: event.target.value })}
                    />
                  ) : (
                    <span className="px-1.5">{line.description}</span>
                  )}
                </td>
                <td className="w-16 p-1 text-right tabular-nums">
                  {editable ? (
                    <Input
                      aria-label={`Line ${index + 1} quantity`}
                      className={`${CELL_INPUT} text-right`}
                      type="number"
                      min={0}
                      step="any"
                      value={String(line.quantity)}
                      onChange={(event) =>
                        onLineChange(index, { quantity: parseCardNumber(event.target.value) })
                      }
                    />
                  ) : (
                    <span className="px-1.5">{line.quantity}</span>
                  )}
                </td>
                <td className="px-2 text-muted-foreground">{line.unitLabel}</td>
                {showPrice ? (
                  <td className="w-24 p-1 text-right tabular-nums">
                    {editable ? (
                      <Input
                        aria-label={`Line ${index + 1} rate`}
                        className={`${CELL_INPUT} text-right`}
                        type="number"
                        min={0}
                        step="0.01"
                        value={String(line.unitPrice ?? 0)}
                        onChange={(event) =>
                          onLineChange(index, { unitPrice: parseCardNumber(event.target.value) })
                        }
                      />
                    ) : (
                      <span className="px-1.5 text-muted-foreground">
                        {formatCurrency(line.unitPrice ?? 0)}
                      </span>
                    )}
                  </td>
                ) : null}
                {costCodes ? (
                  <td className="w-36 p-1">
                    {editable ? (
                      <RecordCostCodeSelect
                        projectId={costCodes.projectId}
                        costCodeId={line.costCodeId ?? null}
                        costCodeLabel={line.costCodeLabel ?? null}
                        required={costCodes.required}
                        disabled={false}
                        onChange={(costCode) => onLineChange(index, costCode)}
                      />
                    ) : (
                      <span className="px-1.5 text-muted-foreground">
                        {line.costCodeLabel ?? '—'}
                      </span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
          {footer ? (
            <tfoot className="bg-muted/60">
              <tr>
                <td colSpan={columns} className="px-2 py-1.5">
                  {footer}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
