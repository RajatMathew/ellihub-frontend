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
  costCodeCategoryCreateSchema,
  costCodeCategoryUpdateSchema,
  type CostCodeCategory,
  type CostCodeCategoryCreate,
  type CostCodeCategoryUpdate,
} from '@/modules/catalog/schemas/costcode-category.schema';

type CategoryFormValues = CostCodeCategoryCreate | CostCodeCategoryUpdate;

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CostCodeCategory | null;
  onSubmit: (data: CostCodeCategoryCreate | CostCodeCategoryUpdate) => void;
  isSubmitting: boolean;
}) {
  const isEditing = category != null;
  const schema = isEditing ? costCodeCategoryUpdateSchema : costCodeCategoryCreateSchema;

  const { control, handleSubmit, reset } = useForm<CategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? { id: category.id, name: category.name, description: category.description ?? undefined }
      : { name: '', description: undefined },
  });

  useEffect(() => {
    if (open) {
      reset(
        category
          ? { id: category.id, name: category.name, description: category.description ?? undefined }
          : { name: '', description: undefined }
      );
    }
  }, [open, category, reset]);

  const onOpenChangeWithReset = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeWithReset}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => {
            onSubmit(data);
            if (!isEditing) onOpenChangeWithReset(false);
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
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="category-name">Name</FieldLabel>
                <Input
                  id="category-name"
                  {...field}
                  placeholder="Category name (min 2 characters)"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="category-description">Description</FieldLabel>
                <Input
                  id="category-description"
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Optional description"
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
