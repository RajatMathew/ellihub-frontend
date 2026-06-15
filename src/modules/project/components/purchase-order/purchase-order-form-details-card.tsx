import type { ReactNode } from 'react';

import {
  FormFieldLabel,
  formFieldLabelClassName,
  formInvalidControlClassName,
} from '@/app/components/form-field-label';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { NumberInput } from '@/app/components/ui/number-input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/project/constants/purchase-order';
import type { CreatePOInput } from '@/modules/project/schemas/purchase-order';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { PurchaseOrderFormOption } from './purchase-order-form-types';

interface PurchaseOrderFormDetailsCardProps {
  control: Control<CreatePOInput>;
  vendorOptions: PurchaseOrderFormOption[];
  vendorSearch: string;
  onVendorSearchChange: (value: string) => void;
  isVendorLoading?: boolean;
  isVendorFetchingNextPage?: boolean;
  hasMoreVendors?: boolean;
  onFetchMoreVendors?: () => void;
  tradeCategoryOptions: PurchaseOrderFormOption[];
  rfqOptions: PurchaseOrderFormOption[];
  isVendorLocked?: boolean;
}

const fieldLabelClassName = formFieldLabelClassName;

const invalidControlClassName = formInvalidControlClassName;

export function PurchaseOrderFormDetailsCard({
  control,
  vendorOptions,
  vendorSearch,
  onVendorSearchChange,
  isVendorLoading = false,
  isVendorFetchingNextPage = false,
  hasMoreVendors = false,
  onFetchMoreVendors,
  tradeCategoryOptions,
  rfqOptions,
  isVendorLocked = false,
}: PurchaseOrderFormDetailsCardProps) {
  return (
    <Card id="po-details">
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">PO Details</h2>
          <p className="text-sm text-muted-foreground">
            Core information about this purchase order.
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="vendorId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <RequiredFieldLabel>Vendor</RequiredFieldLabel>
                <InfiniteSearchSelect
                  options={vendorOptions}
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? '')}
                  search={vendorSearch}
                  onSearchChange={onVendorSearchChange}
                  isLoading={isVendorLoading}
                  isFetchingNextPage={isVendorFetchingNextPage}
                  hasNextPage={hasMoreVendors}
                  onFetchNextPage={onFetchMoreVendors}
                  placeholder="Select vendor..."
                  searchPlaceholder="Search vendors..."
                  emptyMessage="No vendors found."
                  loadingMessage="Loading vendors..."
                  disabled={isVendorLocked}
                  triggerClassName={fieldState.invalid ? invalidControlClassName : undefined}
                  testId="po-vendor-select"
                />
                {isVendorLocked && (
                  <p className="text-xs text-muted-foreground">
                    Vendor is locked to the awarded RFQ vendor.
                  </p>
                )}
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="tradeCategoryId"
            control={control}
            render={({ field, fieldState }) => {
              const selectedOption = tradeCategoryOptions.find(
                (option) => option.value === field.value
              );

              return (
                <Field data-invalid={fieldState.invalid}>
                  <RequiredFieldLabel>Trade Category</RequiredFieldLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger
                      aria-invalid={fieldState.invalid}
                      className={fieldState.invalid ? invalidControlClassName : undefined}
                      data-testid="po-trade-category-select"
                    >
                      <span className={selectedOption ? undefined : 'text-muted-foreground'}>
                        {selectedOption?.label ?? 'Select trade...'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {tradeCategoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              );
            }}
          />
        </div>

        <Controller
          name="rfqId"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Linked RFQ (Optional)</FieldLabel>
              <SearchableSelect
                options={rfqOptions}
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value ?? undefined)}
                placeholder="Select RFQ..."
                searchPlaceholder="Search RFQs..."
                emptyMessage="No awarded RFQs found."
                testId="po-rfq-select"
              />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className={fieldLabelClassName}>Description</FieldLabel>
              <Textarea
                {...field}
                placeholder="Describe the purchase order..."
                rows={3}
                aria-invalid={fieldState.invalid}
                className={fieldState.invalid ? invalidControlClassName : undefined}
                data-testid="po-description-input"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="expectedDate"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className={fieldLabelClassName}>Expected Delivery Date</FieldLabel>
                <InputWrapper className={fieldState.invalid ? invalidControlClassName : undefined}>
                  <Input
                    type="date"
                    {...field}
                    aria-invalid={fieldState.invalid}
                    data-testid="po-expected-date-input"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="paymentTerms"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <RequiredFieldLabel>Payment Terms</RequiredFieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    aria-invalid={fieldState.invalid}
                    className={fieldState.invalid ? invalidControlClassName : undefined}
                    data-testid="po-payment-terms-select"
                  >
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
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Controller
            name="leadTime"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className={fieldLabelClassName}>Lead Time (Days)</FieldLabel>
                <InputWrapper className={fieldState.invalid ? invalidControlClassName : undefined}>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    placeholder="e.g. 30"
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={(event) => {
                      if (['e', 'E', '+', '-', '.'].includes(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                    data-testid="po-lead-time-input"
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
                <InputWrapper className={fieldState.invalid ? invalidControlClassName : undefined}>
                  <NumberInput
                    value={field.value ?? 0}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    min={0}
                    max={100}
                    decimalPlaces={3}
                    placeholder="0"
                    aria-invalid={fieldState.invalid}
                    data-testid="po-retainage-percent-input"
                  />
                </InputWrapper>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="address"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className={fieldLabelClassName}>Address</FieldLabel>
                <Textarea
                  {...field}
                  placeholder="Vendor or billing address"
                  rows={3}
                  aria-invalid={fieldState.invalid}
                  className={fieldState.invalid ? invalidControlClassName : undefined}
                  data-testid="po-address-input"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="shipToAddress"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className={fieldLabelClassName}>Ship To Address</FieldLabel>
              <Textarea
                {...field}
                placeholder="123 Job Site Rd, City ST 00000"
                rows={3}
                aria-invalid={fieldState.invalid}
                className={fieldState.invalid ? invalidControlClassName : undefined}
                data-testid="po-ship-to-address-input"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="notes"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className={fieldLabelClassName}>Internal Notes</FieldLabel>
              <Textarea
                {...field}
                placeholder="Internal notes..."
                rows={2}
                aria-invalid={fieldState.invalid}
                className={fieldState.invalid ? invalidControlClassName : undefined}
                data-testid="po-notes-input"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </CardContent>
    </Card>
  );
}

function RequiredFieldLabel({ children }: { children: ReactNode }) {
  return <FormFieldLabel required>{children}</FormFieldLabel>;
}
