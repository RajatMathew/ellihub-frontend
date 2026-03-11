import { Plus, Trash2 } from 'lucide-react';
import { Controller, type Control, type FieldArrayWithId, type FieldErrors } from 'react-hook-form';

import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import { Separator } from '@app/components/ui/separator';

/* ---- Types ---- */

export interface LineItemFieldNames {
  description: string;
  costCodeId: string;
  quantity: string;
  unit: string;
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
}

const DEFAULT_FIELD_NAMES: LineItemFieldNames = {
  description: 'description',
  costCodeId: 'costCodeId',
  quantity: 'quantity',
  unit: 'unit',
  unitPrice: 'unitPrice',
};

const DEFAULT_ITEM = { description: '', quantity: 1, unit: 'EA', unitPrice: 0 };

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
}: LineItemsProps) {
  const fn = { ...DEFAULT_FIELD_NAMES, ...fieldNamesProp };
  const newItem = defaultItem ?? DEFAULT_ITEM;

  return (
    <Card id={id}>
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <Separator />

        <div className="overflow-x-scroll space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="inline-flex items-end gap-3 rounded-lg bg-foreground/5 border border-border p-4 w-fit"
            >
              {/* Description */}
              <div className="w-[200px] shrink-0">
                <Controller
                  name={`${fieldPrefix}.${index}.${fn.description}`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Description
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...f}
                          placeholder="e.g. W12x26 beams"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Cost Code */}
              <div className="w-[200px] shrink-0">
                <Controller
                  name={`${fieldPrefix}.${index}.${fn.costCodeId}`}
                  control={control}
                  render={({ field: f }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Cost Code
                      </FieldLabel>
                      <SearchableSelect
                        options={costCodeOptions}
                        value={f.value ?? null}
                        onValueChange={(v) => f.onChange(v ?? undefined)}
                        placeholder="Select cost code..."
                        searchPlaceholder="Search cost codes..."
                        emptyMessage="No cost codes found."
                      />
                    </Field>
                  )}
                />
              </div>

              {/* Quantity */}
              <div className="w-[100px] shrink-0">
                <Controller
                  name={`${fieldPrefix}.${index}.${fn.quantity}`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Quantity
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          step="0.01"
                          {...f}
                          onChange={(e) => f.onChange(Number(e.target.value))}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Unit */}
              <div className="w-[100px] shrink-0">
                <Controller
                  name={`${fieldPrefix}.${index}.${fn.unit}`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Unit
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...f}
                          placeholder="e.g. EA, LF, SF"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Unit Price */}
              <div className="w-[120px] shrink-0">
                <Controller
                  name={`${fieldPrefix}.${index}.${fn.unitPrice}`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Unit Price
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          step="0.01"
                          {...f}
                          onChange={(e) => f.onChange(Number(e.target.value))}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Delete */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                mode="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        {rootError && 'message' in rootError && (
          <p className="text-sm text-destructive">
            {(rootError as { message?: string }).message}
          </p>
        )}

        <Button type="button" variant="outline" size="sm" onClick={() => append(newItem)}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
