import type { ReactNode } from 'react';

import {
  FormFieldLabel,
  formFieldLabelClassName,
  formInvalidControlClassName,
} from '@/app/components/form-field-label';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Input, InputAddon, InputGroup, InputWrapper } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/project/constants/purchase-order';
import { getPoNumberSuffix, type CreatePOInput } from '@/modules/project/schemas/purchase-order';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { PurchaseOrderFormOption } from './purchase-order-form-types';

interface PurchaseOrderFormDetailsCardProps {
  control: Control<CreatePOInput>;
  vendorOptions: PurchaseOrderFormOption[];
  selectedVendorOption?: PurchaseOrderFormOption | null;
  onVendorOptionChange?: (option: PurchaseOrderFormOption | null) => void;
  vendorSearch: string;
  onVendorSearchChange: (value: string) => void;
  isVendorLoading?: boolean;
  isVendorFetchingNextPage?: boolean;
  hasMoreVendors?: boolean;
  onFetchMoreVendors?: () => void;
  tradeCategoryOptions: PurchaseOrderFormOption[];
  rfqOptions: PurchaseOrderFormOption[];
  selectedRfqOption?: PurchaseOrderFormOption | null;
  onRfqOptionChange?: (option: PurchaseOrderFormOption | null) => void;
  rfqSearch: string;
  onRfqSearchChange: (value: string) => void;
  isRfqLoading?: boolean;
  isRfqFetchingNextPage?: boolean;
  hasMoreRfqs?: boolean;
  onFetchMoreRfqs?: () => void;
  isVendorLocked?: boolean;
  autoPoNumber?: string | null;
  isAutoPoNumberLoading?: boolean;
  poNumberAvailability?: {
    isChecking?: boolean;
    isAvailable?: boolean;
    poNumber?: string | null;
  };
}

const fieldLabelClassName = formFieldLabelClassName;

const invalidControlClassName = formInvalidControlClassName;

export function PurchaseOrderFormDetailsCard({
  control,
  vendorOptions,
  selectedVendorOption,
  onVendorOptionChange,
  vendorSearch,
  onVendorSearchChange,
  isVendorLoading = false,
  isVendorFetchingNextPage = false,
  hasMoreVendors = false,
  onFetchMoreVendors,
  tradeCategoryOptions,
  rfqOptions,
  selectedRfqOption,
  onRfqOptionChange,
  rfqSearch,
  onRfqSearchChange,
  isRfqLoading = false,
  isRfqFetchingNextPage = false,
  hasMoreRfqs = false,
  onFetchMoreRfqs,
  isVendorLocked = false,
  autoPoNumber,
  isAutoPoNumberLoading = false,
  poNumberAvailability,
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

        <PurchaseOrderNumberField
          control={control}
          autoPoNumber={autoPoNumber}
          isAutoPoNumberLoading={isAutoPoNumberLoading}
          availability={poNumberAvailability}
        />

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
                  onOptionChange={onVendorOptionChange}
                  selectedOption={selectedVendorOption}
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
              <InfiniteSearchSelect
                options={rfqOptions}
                value={field.value ?? null}
                onValueChange={(value) => field.onChange(value ?? undefined)}
                onOptionChange={onRfqOptionChange}
                selectedOption={selectedRfqOption}
                search={rfqSearch}
                onSearchChange={onRfqSearchChange}
                isLoading={isRfqLoading}
                isFetchingNextPage={isRfqFetchingNextPage}
                hasNextPage={hasMoreRfqs}
                onFetchNextPage={onFetchMoreRfqs}
                placeholder="Select RFQ..."
                searchPlaceholder="Search RFQs..."
                emptyMessage="No awarded RFQs found."
                loadingMessage="Loading RFQs..."
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
function PurchaseOrderNumberField({
  control,
  autoPoNumber,
  isAutoPoNumberLoading,
  availability,
}: {
  control: Control<CreatePOInput>;
  autoPoNumber?: string | null;
  isAutoPoNumberLoading?: boolean;
  availability?: {
    isChecking?: boolean;
    isAvailable?: boolean;
    poNumber?: string | null;
  };
}) {
  const autoSuffix = autoPoNumber ? getPoNumberSuffix(autoPoNumber) : '';

  return (
    <Controller
      name="poNumberMode"
      control={control}
      render={({ field }) => {
        const mode = field.value ?? 'AUTO';

        return (
          <Field>
            <RequiredFieldLabel>PO Number</RequiredFieldLabel>
            <Tabs value={mode} onValueChange={field.onChange} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:w-[360px]" size="lg">
                <TabsTrigger value="AUTO">Auto Generated</TabsTrigger>
                <TabsTrigger value="MANUAL">Manual</TabsTrigger>
              </TabsList>

              <TabsContent value="AUTO" className="mt-0 space-y-2">
                <InputGroup>
                  <InputAddon variant="lg" className="font-medium text-muted-foreground">
                    PO-
                  </InputAddon>
                  <Input
                    variant="lg"
                    readOnly
                    value={isAutoPoNumberLoading ? 'Loading...' : autoSuffix || 'Next available'}
                    aria-label="Auto generated PO number"
                    className="font-mono"
                  />
                  <InputAddon variant="lg" className="font-semibold text-primary">
                    AUTO
                  </InputAddon>
                </InputGroup>
                <p className="text-xs text-muted-foreground">
                  System assigns the next available number automatically.
                </p>
              </TabsContent>

              <TabsContent value="MANUAL" className="mt-0 space-y-2">
                <Controller
                  name="poNumberSuffix"
                  control={control}
                  render={({ field: suffixField, fieldState }) => {
                    const showAvailability =
                      !fieldState.invalid && (suffixField.value ?? '').trim().length > 0;
                    const availabilityMessage = availability?.isChecking
                      ? 'Checking availability...'
                      : availability?.isAvailable === false
                        ? `${availability.poNumber ?? 'This PO number'} is already in use.`
                        : availability?.isAvailable === true
                          ? `${availability.poNumber ?? 'This PO number'} is available.`
                          : 'Enter a unique numeric PO number.';

                    return (
                      <Field
                        data-invalid={fieldState.invalid || availability?.isAvailable === false}
                      >
                        <InputGroup>
                          <InputAddon variant="lg" className="font-medium text-muted-foreground">
                            PO-
                          </InputAddon>
                          <Input
                            {...suffixField}
                            variant="lg"
                            value={suffixField.value ?? ''}
                            onChange={(event) => {
                              const nextValue = event.target.value
                                .replace(/^PO-/i, '')
                                .replace(/\D/g, '');
                              suffixField.onChange(nextValue);
                            }}
                            placeholder="1001"
                            inputMode="numeric"
                            autoComplete="off"
                            aria-invalid={fieldState.invalid || availability?.isAvailable === false}
                            className="font-mono"
                            data-testid="po-number-suffix-input"
                          />
                        </InputGroup>
                        {fieldState.invalid ? (
                          <FieldError errors={[fieldState.error]} />
                        ) : (
                          <p
                            className={
                              availability?.isAvailable === false
                                ? 'text-xs text-destructive'
                                : showAvailability && availability?.isAvailable === true
                                  ? 'text-xs text-success'
                                  : 'text-xs text-muted-foreground'
                            }
                          >
                            {availabilityMessage}
                          </p>
                        )}
                      </Field>
                    );
                  }}
                />
              </TabsContent>
            </Tabs>
          </Field>
        );
      }}
    />
  );
}
