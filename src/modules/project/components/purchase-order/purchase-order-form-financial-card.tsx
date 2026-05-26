import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { numberInputValue, parseNumberInputValue } from '@/app/lib/number-input';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/project/constants/purchase-order';
import type { CreatePOInput } from '@/modules/project/schemas/purchase-order';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

const fieldLabelClassName = 'text-xs font-semibold uppercase tracking-normal';

export function PurchaseOrderFormFinancialCard({ control }: { control: Control<CreatePOInput> }) {
  return (
    <Card id="financial">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Financial</h2>
          <p className="text-sm text-muted-foreground">
            Payment terms, tax, and retainage settings.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Controller
            name="paymentTerms"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel className={fieldLabelClassName}>Payment Terms</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            name="taxPercent"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className={fieldLabelClassName}>Tax %</FieldLabel>
                <InputWrapper>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.001}
                    value={numberInputValue(field.value)}
                    onChange={(event) => field.onChange(parseNumberInputValue(event.target.value))}
                    aria-invalid={fieldState.invalid}
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="retainagePercent"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className={fieldLabelClassName}>Retainage %</FieldLabel>
                <InputWrapper>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={numberInputValue(field.value)}
                    onChange={(event) => field.onChange(parseNumberInputValue(event.target.value))}
                    aria-invalid={fieldState.invalid}
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
