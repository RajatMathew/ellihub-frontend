import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { Input } from '@app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';

import type { PrimeContract } from '@modules/project/schemas/project-contract.schema';
import {
  upsertPrimeContractInputSchema,
  type UpsertPrimeContractInput,
} from '@modules/project/schemas/project-contract.schema';

const PAYMENT_TERMS_OPTIONS = [
  { value: 'NET_15', label: 'Net 15' },
  { value: 'NET_30', label: 'Net 30' },
  { value: 'NET_45', label: 'Net 45' },
  { value: 'NET_60', label: 'Net 60' },
  { value: 'NET_90', label: 'Net 90' },
  { value: 'DUE_ON_RECEIPT', label: 'Due on Receipt' },
] as const;

interface ContractEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: PrimeContract | undefined;
  onSubmit: (data: UpsertPrimeContractInput) => void;
  isSubmitting: boolean;
}

export function ContractEditDialog({
  open,
  onOpenChange,
  contract,
  onSubmit,
  isSubmitting,
}: ContractEditDialogProps) {
  const { control, handleSubmit, reset } = useForm<UpsertPrimeContractInput>({
    resolver: zodResolver(upsertPrimeContractInputSchema),
    defaultValues: buildDefaults(contract),
  });

  useEffect(() => {
    if (open) {
      reset(buildDefaults(contract));
    }
  }, [open, contract, reset]);

  const onOpenChangeWithReset = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWithReset}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => onSubmit(data))}
          className="space-y-4"
        >
          {/* Row 1: Contract Value + Contract Type */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="contractValue"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="contractValue">Contract Value</FieldLabel>
                  <Input
                    id="contractValue"
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    placeholder="0.00"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="contractType"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="contractType">Contract Type</FieldLabel>
                  <Input
                    id="contractType"
                    {...field}
                    value={field.value ?? ''}
                    placeholder="e.g. Lump Sum"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Row 2: Retainage % + Target Budget % */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="retainagePercent"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="retainagePercent">Retainage %</FieldLabel>
                  <Input
                    id="retainagePercent"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? undefined : e.target.valueAsNumber,
                      )
                    }
                    placeholder="0"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="targetBudgetPercent"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="targetBudgetPercent">
                    Target Budget %
                  </FieldLabel>
                  <Input
                    id="targetBudgetPercent"
                    type="number"
                    step="0.01"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === '' ? undefined : e.target.valueAsNumber,
                      )
                    }
                    placeholder="0"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Payment Terms */}
          <Controller
            name="paymentTerms"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="paymentTerms">Payment Terms</FieldLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger id="paymentTerms">
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Row 3: Estimated Start + Estimated Completion */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="estimatedStartDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="estimatedStartDate">
                    Est. Start Date
                  </FieldLabel>
                  <Input
                    id="estimatedStartDate"
                    type="date"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="estimatedCompletionDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="estimatedCompletionDate">
                    Est. Completion Date
                  </FieldLabel>
                  <Input
                    id="estimatedCompletionDate"
                    type="date"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          {/* Row 4: Actual Start + Actual Completion */}
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="actualStartDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="actualStartDate">
                    Actual Start Date
                  </FieldLabel>
                  <Input
                    id="actualStartDate"
                    type="date"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="actualCompletionDate"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="actualCompletionDate">
                    Actual Completion Date
                  </FieldLabel>
                  <Input
                    id="actualCompletionDate"
                    type="date"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value || null)
                    }
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChangeWithReset(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Contract'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDateInputValue(val: string | null | undefined): string | null {
  if (!val) return null;
  // Backend returns ISO strings; extract YYYY-MM-DD for <input type="date">
  return val.slice(0, 10);
}

function buildDefaults(
  contract: PrimeContract | undefined,
): UpsertPrimeContractInput {
  return {
    contractValue: contract?.contractValue ?? 0,
    contractType: contract?.contractType ?? undefined,
    retainagePercent: contract?.retainagePercent ?? undefined,
    targetBudgetPercent: contract?.targetBudgetPercent ?? undefined,
    paymentTerms: contract?.paymentTerms ?? undefined,
    estimatedStartDate: toDateInputValue(contract?.estimatedStartDate),
    estimatedCompletionDate: toDateInputValue(contract?.estimatedCompletionDate),
    actualStartDate: toDateInputValue(contract?.actualStartDate),
    actualCompletionDate: toDateInputValue(contract?.actualCompletionDate),
  };
}
