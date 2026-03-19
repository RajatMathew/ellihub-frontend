import { Plus, Trash2 } from 'lucide-react';
import { Controller, useWatch, type Control, type UseFieldArrayReturn } from 'react-hook-form';

import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import { formatCurrency } from '@app/lib/helpers';

import type { CreatePCOInput, PCOLineItemCategory } from '../schemas/pco.schema';

/* ---- Types ---- */

interface CostCodeOption {
  value: string;
  label: string;
}

const UNIT_OPTIONS = [
  { value: 'EA', label: 'Each' },
  { value: 'LF', label: 'Linear Foot' },
  { value: 'SF', label: 'Square Feet' },
  { value: 'SY', label: 'Square Yard' },
  { value: 'CY', label: 'Cubic Yard' },
  { value: 'TON', label: 'Ton' },
  { value: 'LB', label: 'Pound' },
  { value: 'GAL', label: 'Gallon' },
  { value: 'HR', label: 'Hour' },
  { value: 'DAY', label: 'Day' },
  { value: 'WK', label: 'Week' },
  { value: 'MO', label: 'Month' },
  { value: 'LS', label: 'Lump Sum' },
  { value: 'LOT', label: 'Lot' },
];

const CATEGORY_LABELS: Record<PCOLineItemCategory, string> = {
  MATERIALS: 'Materials',
  LABOR: 'Labor',
  EQUIPMENT: 'Equipment',
  SUBCONTRACTOR: 'Subcontractor',
  OTHER: 'Other',
};

const CATEGORY_DEFAULTS: Record<PCOLineItemCategory, { unit: string }> = {
  MATERIALS: { unit: 'EA' },
  LABOR: { unit: 'HR' },
  EQUIPMENT: { unit: 'DAY' },
  SUBCONTRACTOR: { unit: 'LS' },
  OTHER: { unit: 'EA' },
};

/* ---- Per-row amount cell ---- */

function RowAmount({
  control,
  index,
}: {
  control: Control<CreatePCOInput>;
  index: number;
}) {
  const qty = useWatch({ control, name: `lineItems.${index}.qty` });
  const unitPrice = useWatch({ control, name: `lineItems.${index}.unitPrice` });
  const amount = (qty ?? 0) * (unitPrice ?? 0);
  return (
    <span className="text-sm font-semibold tabular-nums">
      {amount > 0 ? formatCurrency(amount) : '—'}
    </span>
  );
}

/* ---- Section subtotal ---- */

function SectionSubtotal({
  control,
  indices,
  label,
}: {
  control: Control<CreatePCOInput>;
  indices: number[];
  label: string;
}) {
  const lineItems = useWatch({ control, name: 'lineItems' });
  const subtotal = indices.reduce((sum, idx) => {
    const li = lineItems?.[idx];
    if (!li) return sum;
    return sum + (li.qty ?? 0) * (li.unitPrice ?? 0);
  }, 0);

  return (
    <div className="flex items-center justify-end gap-3 px-3 py-2">
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums min-w-[100px] text-right">
        {subtotal > 0 ? formatCurrency(subtotal) : '—'}
      </span>
    </div>
  );
}

/* ---- Single category section ---- */

interface CategorySectionProps {
  category: PCOLineItemCategory;
  control: Control<CreatePCOInput>;
  fieldArray: UseFieldArrayReturn<CreatePCOInput, 'lineItems'>;
  costCodeOptions: CostCodeOption[];
  onAddCostCode?: () => void;
}

function CategorySection({
  category,
  control,
  fieldArray,
  costCodeOptions,
  onAddCostCode,
}: CategorySectionProps) {
  const { fields, append, remove } = fieldArray;

  // Use useWatch for category values, but clamp to fields.length to avoid stale-index ghost rows
  const lineItems = useWatch({ control, name: 'lineItems' });
  const safeLength = Math.min(lineItems?.length ?? 0, fields.length);
  const indices: number[] = [];
  for (let i = 0; i < safeLength; i++) {
    if ((lineItems![i].category ?? 'MATERIALS') === category) {
      indices.push(i);
    }
  }

  const label = CATEGORY_LABELS[category];
  const defaults = CATEGORY_DEFAULTS[category];

  return (
    <div className="border-b last:border-b-0">
      {/* Header bar */}
      <div className="bg-muted/50 px-3 py-2.5">
        <h3 className="text-sm font-semibold">{label}</h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-10">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[160px]">
                Cost Code
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Item Name
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[90px]">
                Quantity
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[140px]">
                Unit Type
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[120px]">
                Unit Cost (USD)
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold tracking-widest text-muted-foreground uppercase w-[120px]">
                Item Cost (USD)
              </th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {indices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No items yet.
                </td>
              </tr>
            ) : (
              indices.map((fieldIndex, rowNum) => (
                <tr key={fields[fieldIndex].id} className="border-b last:border-0">
                  <td className="px-3 py-1.5 text-muted-foreground">{rowNum + 1}</td>
                  <td className="px-3 py-1.5">
                    <Controller
                      name={`lineItems.${fieldIndex}.costCodeId`}
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={costCodeOptions}
                          value={field.value ?? null}
                          onValueChange={(v) => field.onChange(v ?? undefined)}
                          placeholder="Select code"
                          searchPlaceholder="Search..."
                          emptyMessage="No codes."
                          onAdd={onAddCostCode}
                          addLabel="Add Cost Code"
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Controller
                      name={`lineItems.${fieldIndex}.description`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Add name"
                          className="h-8 border-0 shadow-none px-1 focus-visible:ring-1"
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Controller
                      name={`lineItems.${fieldIndex}.qty`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="h-8 border-0 shadow-none px-1 focus-visible:ring-1"
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Controller
                      name={`lineItems.${fieldIndex}.unit`}
                      control={control}
                      render={({ field }) => (
                        <SearchableSelect
                          options={UNIT_OPTIONS}
                          value={field.value ?? null}
                          onValueChange={(v) => field.onChange(v ?? '')}
                          placeholder="Select type"
                          searchPlaceholder="Search..."
                          emptyMessage="No match."
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Controller
                      name={`lineItems.${fieldIndex}.unitPrice`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          placeholder="Add cost"
                          className="h-8 border-0 shadow-none px-1 focus-visible:ring-1"
                        />
                      )}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <RowAmount control={control} index={fieldIndex} />
                  </td>
                  <td className="px-3 py-1.5">
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      type="button"
                      disabled={fields.length <= 1}
                      onClick={() => remove(fieldIndex)}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add + Subtotal row */}
      <div className="flex items-center justify-between px-3 py-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          className="text-primary"
          onClick={() =>
            append({
              title: '',
              description: '',
              qty: 1,
              unit: defaults.unit,
              unitPrice: 0,
              category,
              costCodeId: undefined,
            })
          }
        >
          <Plus className="size-3.5 mr-1" />
          Add new item
        </Button>
        <SectionSubtotal control={control} indices={indices} label={label} />
      </div>
    </div>
  );
}

/* ---- Main export: all 5 sections ---- */

interface CostEstimationSectionsProps {
  control: Control<CreatePCOInput>;
  fieldArray: UseFieldArrayReturn<CreatePCOInput, 'lineItems'>;
  costCodeOptions: CostCodeOption[];
  onAddCostCode?: () => void;
}

export function CostEstimationSections({
  control,
  fieldArray,
  costCodeOptions,
  onAddCostCode,
}: CostEstimationSectionsProps) {
  const categories: PCOLineItemCategory[] = ['MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER'];

  return (
    <div className="border rounded-lg overflow-hidden">
      {categories.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          control={control}
          fieldArray={fieldArray}
          costCodeOptions={costCodeOptions}
          onAddCostCode={onAddCostCode}
        />
      ))}
    </div>
  );
}
