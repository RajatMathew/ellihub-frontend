import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

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

import {
  VENDOR_STATUS_OPTIONS,
  VENDOR_TYPE_OPTIONS,
} from '../constants/vendors.constants';
import { useCreateVendorMutation } from '../hooks';
import {
  quickCreateVendorSchema,
  type QuickCreateVendorValues,
} from '../schemas/vendor.schema';

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

  const { control, handleSubmit, reset } = useForm<QuickCreateVendorValues>({
    resolver: zodResolver(quickCreateVendorSchema),
    defaultValues: {
      name: '',
      type: 'MATERIAL',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (open) {
      reset({ name: '', type: 'MATERIAL', status: 'ACTIVE' });
    }
  }, [open, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = async (data: QuickCreateVendorValues) => {
    const created = await createMutation.mutateAsync({
      name: data.name,
      type: data.type,
      status: data.status,
    });
    onCreated({ id: created.id, name: created.name });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[13px] font-bold tracking-[0.05em] uppercase">
            New Vendor
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase">
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
            name="type"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase">
                  Vendor Type
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VENDOR_TYPE_OPTIONS.map((opt) => (
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

          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase">
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
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending}
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Vendor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
