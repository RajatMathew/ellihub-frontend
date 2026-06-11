import React, { type ReactNode } from 'react';

import { calculateRoundedLineAmount } from '@/modules/project/components/purchase-order/purchase-order-totals';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import {
  Controller,
  useWatch,
  type Control,
  type FieldArrayWithId,
  type FieldErrors,
} from 'react-hook-form';

import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@app/components/ui/command';
import { FieldError as FieldErr } from '@app/components/ui/field';
import { Input } from '@app/components/ui/input';
import { NumberInput } from '@app/components/ui/number-input';
import { Popover, PopoverContent, PopoverTrigger } from '@app/components/ui/popover';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import { Separator } from '@app/components/ui/separator';
import { formatCurrency } from '@app/lib/helpers';
import { cn } from '@app/lib/utils';

/* ---- Unit options ---- */

const UNIT_OPTIONS = [
  { value: 'EA', label: 'EA — Each' },
  { value: 'LF', label: 'LF — Linear Foot' },
  { value: 'SF', label: 'SF — Square Foot' },
  { value: 'SY', label: 'SY — Square Yard' },
  { value: 'CF', label: 'CF — Cubic Foot' },
  { value: 'CY', label: 'CY — Cubic Yard' },
  { value: 'TON', label: 'TON — Ton' },
  { value: 'LB', label: 'LB — Pound' },
  { value: 'GAL', label: 'GAL — Gallon' },
  { value: 'HR', label: 'HR — Hour' },
  { value: 'DAY', label: 'DAY — Day' },
  { value: 'WK', label: 'WK — Week' },
  { value: 'MO', label: 'MO — Month' },
  { value: 'LS', label: 'LS — Lump Sum' },
  { value: 'LOT', label: 'LOT — Lot' },
] as const;

/* ---- Types ---- */

export interface LineItemFieldNames {
  description: string;
  costCodeId: string;
  quantity: string;
  unit: string;
  unitId: string;
  unitPrice: string;
}

export interface LineItemsProps {
  /** react-hook-form control (use Control<any> to avoid generic coupling) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  /** The array field name, e.g. "lineItems" or "deliverables" */
  fieldPrefix: string;
  /** useFieldArray fields */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fields: FieldArrayWithId<any>[];
  /** useFieldArray append */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  append: (value: any) => void;
  /** useFieldArray remove */
  remove: (index: number) => void;
  /** Cost code options for the SearchableSelect */
  costCodeOptions: { value: string; label: string }[];
  /** Mapping of field names within each line item */
  fieldNames?: Partial<LineItemFieldNames>;
  /** Root-level array error (e.g. formState.errors.lineItems?.root) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rootError?: FieldErrors<any>[string];
  /** Section title */
  title?: string;
  /** Section subtitle */
  subtitle?: string;
  /** Add button label */
  addLabel?: string;
  /** Default values for a new line item */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultItem?: Record<string, any>;
  /** Card id for section nav */
  id?: string;
  /** Show computed line total (qty × unitPrice) for each row */
  showLineTotal?: boolean;
  /** Hide the unit price column */
  hideUnitPrice?: boolean;
  /** Hide the cost code column */
  hideCostCode?: boolean;
  /** Unit options for the UnitCombobox */
  unitOptions?: { value: string; label: string }[];
  /** Allow entering free-form unit values instead of choosing an option */
  allowCustomUnit?: boolean;
  /** Footer content rendered inside the card (e.g. receipt-style totals) */
  children?: ReactNode;
  /** Callback to add a new cost code — shows "+ Add" in cost code dropdown */
  onAddCostCode?: () => void;
}

const DEFAULT_FIELD_NAMES: LineItemFieldNames = {
  description: 'description',
  costCodeId: 'costCodeId',
  quantity: 'quantity',
  unit: 'unit',
  unitId: 'unitId',
  unitPrice: 'unitPrice',
};

const DEFAULT_ITEM = { description: '', quantity: 1, unit: 'EA', unitPrice: 0 };

/* ---- Unit Combobox ---- */

function UnitCombobox({
  value,
  onChange,
  invalid,
  options = UNIT_OPTIONS,
  allowCustomUnit = true,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  options?: readonly { value: string; label: string }[] | { value: string; label: string }[];
  allowCustomUnit?: boolean;
  testId?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filtered = options.filter(
    (u) =>
      u.value.toLowerCase().includes(search.toLowerCase()) ||
      u.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((u) => u.value === value);
  const displayValue = selectedOption ? selectedOption.label : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-invalid={invalid}
          data-testid={testId}
          className={cn(
            'flex h-8.5 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-[0.8125rem] shadow-xs shadow-black/5 transition-shadow outline-none text-left',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{displayValue || 'Unit'}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60 -me-0.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[180px] p-0" align="start" sideOffset={4}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={allowCustomUnit ? 'Search or type...' : 'Search units...'}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustomUnit && search ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded cursor-pointer"
                  onClick={() => {
                    onChange(search.toUpperCase());
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  Use &quot;{search.toUpperCase()}&quot;
                </button>
              ) : search ? (
                'No units found.'
              ) : allowCustomUnit ? (
                'Type a custom unit'
              ) : (
                'No units available.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((u) => (
                <CommandItem
                  key={u.value}
                  value={u.value}
                  onSelect={() => {
                    onChange(u.value);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  {u.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ---- Line Total Cell ---- */

function LineTotalCell({
  control,
  fieldPrefix,
  index,
  quantityField,
  unitPriceField,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  fieldPrefix: string;
  index: number;
  quantityField: string;
  unitPriceField: string;
}) {
  const qty = useWatch({ control, name: `${fieldPrefix}.${index}.${quantityField}` }) ?? 0;
  const price = useWatch({ control, name: `${fieldPrefix}.${index}.${unitPriceField}` }) ?? 0;
  return (
    <span className="text-sm font-medium tabular-nums">
      {formatCurrency(calculateRoundedLineAmount({ quantity: qty, unitPrice: price }))}
    </span>
  );
}

/* ---- Component ---- */

export function LineItems({
  control,
  fieldPrefix,
  fields,
  append,
  remove,
  costCodeOptions,
  fieldNames: fieldNamesProp,
  rootError,
  title = 'Line Items',
  subtitle = 'At least one line item is required.',
  addLabel = 'Add Line Item',
  defaultItem,
  id = 'line-items',
  showLineTotal = false,
  hideUnitPrice = false,
  hideCostCode = false,
  unitOptions,
  allowCustomUnit = true,
  children,
  onAddCostCode,
}: LineItemsProps) {
  const fn = { ...DEFAULT_FIELD_NAMES, ...fieldNamesProp };
  const newItem = defaultItem ?? DEFAULT_ITEM;

  const thClass = 'pb-2 pr-3 text-xs font-semibold tracking-normal text-muted-foreground text-left';

  return (
    <Card id={id}>
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <Separator />

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className={`${thClass} w-8`}>#</th>
                <th className={thClass}>Item</th>
                {!hideCostCode && <th className={`${thClass} w-[180px]`}>Cost Code</th>}
                <th className={`${thClass} w-[90px] text-right`}>Qty</th>
                <th className={`${thClass} w-[90px]`}>Unit</th>
                {!hideUnitPrice && (
                  <th className={`${thClass} w-[110px] text-right`}>Unit Price</th>
                )}
                {showLineTotal && <th className={`${thClass} w-[110px] text-right`}>Amount</th>}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr
                  key={field.id}
                  data-testid={`${fieldPrefix}-${index}-row`}
                  className="border-b last:border-0 align-top"
                >
                  <td className="py-2.5 pr-3 text-sm text-muted-foreground pt-3.5">{index + 1}</td>

                  {/* Description */}
                  <td className="py-2.5 pr-3">
                    <Controller
                      name={`${fieldPrefix}.${index}.${fn.description}`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <div>
                          <Input
                            {...f}
                            placeholder="e.g. W12x26 beams"
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                            data-testid={`${fieldPrefix}-${index}-description-input`}
                          />
                          {fieldState.invalid && <FieldErr errors={[fieldState.error]} />}
                        </div>
                      )}
                    />
                  </td>

                  {/* Cost Code */}
                  {!hideCostCode && (
                    <td className="py-2.5 pr-3">
                      <Controller
                        name={`${fieldPrefix}.${index}.${fn.costCodeId}`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <div>
                            <SearchableSelect
                              options={costCodeOptions}
                              value={f.value ?? null}
                              onValueChange={(v) => f.onChange(v ?? '')}
                              placeholder="Select..."
                              searchPlaceholder="Search..."
                              emptyMessage="None found."
                              onAdd={onAddCostCode}
                              addLabel="Add Cost Code"
                              className={fieldState.invalid ? 'border-destructive' : undefined}
                              testId={`${fieldPrefix}-${index}-cost-code-select`}
                            />
                            {fieldState.invalid && <FieldErr errors={[fieldState.error]} />}
                          </div>
                        )}
                      />
                    </td>
                  )}

                  {/* Quantity */}
                  <td className="py-2.5 pr-3">
                    <Controller
                      name={`${fieldPrefix}.${index}.${fn.quantity}`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <div>
                          <NumberInput
                            value={f.value ?? 0}
                            onValueChange={f.onChange}
                            onBlur={f.onBlur}
                            name={f.name}
                            ref={f.ref}
                            min={0}
                            decimalPlaces={3}
                            placeholder="0"
                            aria-invalid={fieldState.invalid}
                            className="text-right"
                            data-testid={`${fieldPrefix}-${index}-quantity-input`}
                          />
                          {fieldState.invalid && <FieldErr errors={[fieldState.error]} />}
                        </div>
                      )}
                    />
                  </td>

                  {/* Unit */}
                  <td className="py-2.5 pr-3">
                    <Controller
                      name={`${fieldPrefix}.${index}.${fn.unit}`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <div>
                          <UnitCombobox
                            value={f.value ?? ''}
                            onChange={f.onChange}
                            invalid={fieldState.invalid}
                            options={unitOptions}
                            allowCustomUnit={allowCustomUnit}
                            testId={`${fieldPrefix}-${index}-unit-select`}
                          />
                          {fieldState.invalid && <FieldErr errors={[fieldState.error]} />}
                        </div>
                      )}
                    />
                  </td>

                  {/* Unit Price */}
                  {!hideUnitPrice && (
                    <td className="py-2.5 pr-3">
                      <Controller
                        name={`${fieldPrefix}.${index}.${fn.unitPrice}`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <div>
                            <NumberInput
                              value={f.value ?? 0}
                              onValueChange={f.onChange}
                              onBlur={f.onBlur}
                              name={f.name}
                              ref={f.ref}
                              min={0}
                              decimalPlaces={3}
                              placeholder="0.00"
                              aria-invalid={fieldState.invalid}
                              className="text-right"
                              data-testid={`${fieldPrefix}-${index}-unit-price-input`}
                            />
                            {fieldState.invalid && <FieldErr errors={[fieldState.error]} />}
                          </div>
                        )}
                      />
                    </td>
                  )}

                  {/* Line Total */}
                  {showLineTotal && (
                    <td className="py-2.5 text-right pt-3.5">
                      <LineTotalCell
                        control={control}
                        fieldPrefix={fieldPrefix}
                        index={index}
                        quantityField={fn.quantity}
                        unitPriceField={fn.unitPrice}
                      />
                    </td>
                  )}

                  {/* Delete */}
                  <td className="py-2.5 pl-1 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      mode="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                      data-testid={`${fieldPrefix}-${index}-delete-button`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rootError && 'message' in rootError && (
          <p className="text-sm text-destructive">{(rootError as { message?: string }).message}</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(newItem)}
          data-testid={`${fieldPrefix}-add-button`}
        >
          <Plus className="size-4" />
          {addLabel}
        </Button>

        {children}
      </CardContent>
    </Card>
  );
}
