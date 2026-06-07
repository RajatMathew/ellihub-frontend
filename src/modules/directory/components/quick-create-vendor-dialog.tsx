import { useEffect, type BaseSyntheticEvent } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input } from '@/app/components/ui/input';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  VENDOR_STATUS_OPTIONS,
  VENDOR_TYPE_OPTIONS,
} from '@/modules/directory/constants/vendors.constants';
import {
  useCreateVendorMutation,
  useVendorTypesQuery,
} from '@/modules/directory/hooks/vendors.hooks';
import {
  quickCreateVendorSchema,
  type QuickCreateVendorValues,
  type VendorTypeObject,
} from '@/modules/directory/schemas/vendor.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

export function QuickCreateVendorDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (vendor: { id: string; name: string }) => void;
}) {
  const createMutation = useCreateVendorMutation();
  const { data: apiTypes } = useVendorTypesQuery();

  const defaultTypeId = apiTypes?.[0]?.id ?? '';

  const { control, handleSubmit, reset } = useForm<QuickCreateVendorValues>({
    resolver: zodResolver(quickCreateVendorSchema),
    defaultValues: {
      name: '',
      email: '',
      type: defaultTypeId,
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: '', email: '', type: defaultTypeId, status: 'ACTIVE' });
    }
  }, [open, reset, defaultTypeId]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = async (data: QuickCreateVendorValues, e?: BaseSyntheticEvent) => {
    e?.stopPropagation();
    const created = await createMutation.mutateAsync({
      name: data.name,
      email: data.email.trim() || undefined,
      typeId: data.type || undefined,
      status: data.status,
    });
    onCreated({ id: created.id, name: created.name });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider">
            New Vendor
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalidFormSubmit)} className="space-y-4">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vendor Name
                </FieldLabel>
                <Input
                  {...field}
                  placeholder="Enter vendor name"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </FieldLabel>
                <Input
                  {...field}
                  type="email"
                  placeholder="vendor@example.com"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="type"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Vendor Type
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(apiTypes && apiTypes.length > 0
                      ? apiTypes.map((t) => ({ value: t.id, label: t.label }))
                      : VENDOR_TYPE_OPTIONS
                    ).map((opt) => {
                      const val =
                        typeof opt.value === 'string'
                          ? opt.value
                          : (opt.value as VendorTypeObject).id;
                      return (
                        <SelectItem key={val} value={val}>
                          {opt.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_STATUS_OPTIONS.map((opt) => (
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="h-8 rounded-sm px-3 text-sm font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending}
              className="h-8 rounded-sm px-3 text-sm font-semibold"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
