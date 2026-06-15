import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
  lookupCreateSchema,
  lookupUpdateSchema,
  type Lookup,
  type LookupCreate,
  type LookupUpdate,
} from '@/modules/lookup/schemas/lookup.schema';

type LookupFormValues = LookupCreate | LookupUpdate;

export function LookupFormDialog({
  open,
  onOpenChange,
  lookup,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookup: Lookup | null;
  onSubmit: (data: LookupCreate | LookupUpdate) => void;
  isSubmitting: boolean;
}) {
  const isEditing = lookup != null;
  const schema = isEditing ? lookupUpdateSchema : lookupCreateSchema;

  const { control, handleSubmit, reset } = useForm<LookupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: lookup
      ? { id: lookup.id, type: lookup.type, label: lookup.label ?? '' }
      : { type: '', label: '' },
  });

  useEffect(() => {
    if (open) {
      reset(
        lookup
          ? { id: lookup.id, type: lookup.type, label: lookup.label ?? '' }
          : { type: '', label: '' }
      );
    }
  }, [open, lookup, reset]);

  const onOpenChangeWithReset = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWithReset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Lookup' : 'New Lookup'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => {
            onSubmit(data);
          }, onInvalidFormSubmit)}
          className="space-y-4"
        >
          {isEditing && (
            <Controller
              name="id"
              control={control}
              render={({ field }) => <input type="hidden" {...field} />}
            />
          )}
          <Controller
            name="type"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="lookup-type">Type</FieldLabel>
                <Input
                  id="lookup-type"
                  {...field}
                  placeholder="e.g. INVOICE_STATUS"
                  aria-invalid={fieldState.invalid}
                  disabled={isEditing}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="label"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="lookup-label">Label</FieldLabel>
                <Input
                  id="lookup-label"
                  {...field}
                  placeholder="Display label"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChangeWithReset(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
