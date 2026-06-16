import { useEffect, type BaseSyntheticEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { GC_STATUS_OPTIONS } from '@/modules/directory/constants/gc.constants';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/directory/constants/shared.constants';
import {
  VENDOR_STATUS_OPTIONS,
  VENDOR_TYPE_OPTIONS,
} from '@/modules/directory/constants/vendors.constants';
import { useCreateGCMutation, useGCTypesQuery } from '@/modules/directory/hooks/gc.hooks';
import {
  useCreateVendorMutation,
  useVendorTypesQuery,
} from '@/modules/directory/hooks/vendors.hooks';
import {
  gcFormSchema,
  type GCFormValues,
  type PaymentTerms as GCPaymentTerms,
} from '@/modules/directory/schemas/gc.schema';
import {
  vendorFormSchema,
  type VendorFormValues,
  type PaymentTerms as VendorPaymentTerms,
  type VendorStatus,
} from '@/modules/directory/schemas/vendor.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Control, type FieldValues, type Path } from 'react-hook-form';
import { toast } from 'sonner';

type CreatedCompany = { id: string; name: string };

interface ContactCompanyCreateDialogProps {
  type: 'VENDOR' | 'GC';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (company: CreatedCompany) => void;
}

const vendorDefaults: VendorFormValues = {
  name: '',
  email: '',
  type: '',
  status: 'ACTIVE',
  taxId: '',
  website: '',
  paymentTerms: 'NET_30',
};

const gcDefaults: GCFormValues = {
  name: '',
  gcTypeId: '',
  website: '',
  status: 'ACTIVE',
  email: '',
  phone: '',
  address: '',
  paymentTerms: 'NET_30',
  retainagePercent: 10,
};

export function ContactCompanyCreateDialog(props: ContactCompanyCreateDialogProps) {
  return props.type === 'VENDOR' ? (
    <VendorCreateDialog {...props} />
  ) : (
    <GCCreateDialog {...props} />
  );
}

function VendorCreateDialog({ open, onOpenChange, onCreated }: ContactCompanyCreateDialogProps) {
  const createMutation = useCreateVendorMutation();
  const vendorTypesQuery = useVendorTypesQuery();
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: vendorDefaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      ...vendorDefaults,
      type: vendorTypesQuery.data?.[0]?.id ?? '',
    });
  }, [form, open, vendorTypesQuery.data]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset(vendorDefaults);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: VendorFormValues, event?: BaseSyntheticEvent) => {
    event?.stopPropagation();
    const created = await createMutation.mutateAsync({
      name: data.name,
      email: data.email,
      typeId: data.type,
      status: data.status as VendorStatus,
      taxId: data.taxId || undefined,
      website: data.website || undefined,
      paymentTerms: data.paymentTerms as VendorPaymentTerms,
    });
    toast.success('Vendor created.');
    onCreated({ id: created.id, name: created.name });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-hidden">
        <form
          className="flex max-h-[calc(90dvh-3rem)] min-h-0 flex-col"
          onSubmit={(event) => void form.handleSubmit(onSubmit, onInvalidFormSubmit)(event)}
        >
          <DialogHeader>
            <DialogTitle>Create Vendor</DialogTitle>
            <DialogDescription>
              Complete the vendor profile, then link it to this contact.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            <SectionTitle title="Vendor Details" />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField control={form.control} name="name" label="Vendor Name" />
              <TextField control={form.control} name="email" label="Email" type="email" />
              <Controller
                name="type"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold uppercase tracking-normal">
                      Vendor Type
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(vendorTypesQuery.data && vendorTypesQuery.data.length > 0
                          ? vendorTypesQuery.data.map((type) => ({
                              value: type.id,
                              label: type.label ?? type.id,
                            }))
                          : VENDOR_TYPE_OPTIONS.map((option) => ({
                              value:
                                typeof option.value === 'string' ? option.value : option.value.id,
                              label: option.label,
                            }))
                        ).map((option) => (
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
              <SelectField
                control={form.control}
                name="status"
                label="Status"
                options={VENDOR_STATUS_OPTIONS}
              />
            </div>

            <SectionTitle title="Compliance And Terms" />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField control={form.control} name="taxId" label="Tax ID" />
              <TextField control={form.control} name="website" label="Website" />
              <SelectField
                control={form.control}
                name="paymentTerms"
                label="Payment Terms"
                options={PAYMENT_TERMS_OPTIONS}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GCCreateDialog({ open, onOpenChange, onCreated }: ContactCompanyCreateDialogProps) {
  const createMutation = useCreateGCMutation();
  const gcTypesQuery = useGCTypesQuery();
  const form = useForm<GCFormValues>({
    resolver: zodResolver(gcFormSchema),
    defaultValues: gcDefaults,
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      ...gcDefaults,
      gcTypeId: gcTypesQuery.data?.[0]?.id ?? '',
    });
  }, [form, gcTypesQuery.data, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset(gcDefaults);
    onOpenChange(nextOpen);
  };

  const onSubmit = async (data: GCFormValues, event?: BaseSyntheticEvent) => {
    event?.stopPropagation();
    const created = await createMutation.mutateAsync({
      name: data.name,
      gcTypeId: data.gcTypeId,
      status: data.status,
      email: data.email || undefined,
      phone: data.phone || undefined,
      address: data.address || undefined,
      website: data.website || undefined,
      paymentTerms: data.paymentTerms as GCPaymentTerms,
      retainagePercent: data.retainagePercent,
    });
    toast.success('General contractor created.');
    onCreated({ id: created.id, name: created.name });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-hidden">
        <form
          className="flex max-h-[calc(90dvh-3rem)] min-h-0 flex-col"
          onSubmit={(event) => void form.handleSubmit(onSubmit, onInvalidFormSubmit)(event)}
        >
          <DialogHeader>
            <DialogTitle>Create GC</DialogTitle>
            <DialogDescription>
              Complete the general contractor profile, then link it to this contact.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            <SectionTitle title="GC Details" />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField control={form.control} name="name" label="GC Name" />
              <Controller
                name="gcTypeId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold uppercase tracking-normal">
                      GC Type
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {(gcTypesQuery.data ?? []).map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label ?? type.name ?? type.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <SelectField
                control={form.control}
                name="status"
                label="Status"
                options={GC_STATUS_OPTIONS}
              />
              <TextField control={form.control} name="email" label="Email" type="email" />
              <TextField control={form.control} name="phone" label="Phone" />
              <TextField control={form.control} name="website" label="Website" />
            </div>

            <SectionTitle title="Address And Terms" />
            <div className="grid gap-4 md:grid-cols-2">
              <Controller
                name="address"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="md:col-span-2">
                    <FieldLabel className="text-xs font-semibold uppercase tracking-normal">
                      Address
                    </FieldLabel>
                    <Textarea {...field} rows={3} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <SelectField
                control={form.control}
                name="paymentTerms"
                label="Payment Terms"
                options={PAYMENT_TERMS_OPTIONS}
              />
              <TextField
                control={form.control}
                name="retainagePercent"
                label="Retainage Percent"
                type="number"
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create GC'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <Separator />
    </div>
  );
}

function TextField<T extends FieldValues>({
  control,
  name,
  label,
  type = 'text',
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  type?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel className="text-xs font-semibold uppercase tracking-normal">
            {label}
          </FieldLabel>
          <Input
            {...field}
            type={type}
            aria-invalid={fieldState.invalid}
            value={String(field.value ?? '')}
            onChange={(event) => {
              field.onChange(
                type === 'number'
                  ? event.target.value === ''
                    ? ''
                    : event.target.valueAsNumber
                  : event.target.value
              );
            }}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel className="text-xs font-semibold uppercase tracking-normal">
            {label}
          </FieldLabel>
          <Select value={String(field.value ?? '')} onValueChange={field.onChange}>
            <SelectTrigger aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
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
  );
}
