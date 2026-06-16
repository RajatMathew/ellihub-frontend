import { useEffect } from 'react';
import { Controller } from 'react-hook-form';

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
import { useCostCodeCategoriesQuery, useCostCodeForm } from '@/modules/catalog/hooks';
import type { CostCode, CostCodeCreate } from '@/modules/catalog/schemas/costcode.schema';

const FIELD_LABEL_CLASS = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

export function CostCodeFormDialog({
  open,
  onOpenChange,
  costCode,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costCode?: CostCode | null;
  onSubmit: (data: CostCodeCreate | CostCode) => void;
  isSubmitting: boolean;
}) {
  const isEditing = costCode != null;
  const { control, handleSubmit, reset } = useCostCodeForm(
    isEditing && costCode ? costCode : undefined
  );
  const { data: categories = [], isLoading: categoriesLoading } = useCostCodeCategoriesQuery();

  useEffect(() => {
    if (open) {
      if (isEditing && costCode) {
        reset({
          id: costCode.id,
          name: costCode.name,
          code: costCode.code,
          costCodeCategoryId: costCode.costCodeCategoryId,
          description: costCode.description ?? undefined,
        });
      } else {
        reset({
          name: '',
          code: '',
          costCodeCategoryId: '',
          description: undefined,
        });
      }
    }
  }, [open, isEditing, costCode, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-wide uppercase">
            {isEditing ? 'Edit Cost Code' : 'New Cost Code'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(
            (data) => onSubmit(data as CostCodeCreate | CostCode),
            onInvalidFormSubmit
          )}
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
                <FieldLabel htmlFor="costcode-name" className={FIELD_LABEL_CLASS}>Name</FieldLabel>
                <Input
                  {...field}
                  id="costcode-name"
                  placeholder="Enter name"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="code"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="costcode-code" className={FIELD_LABEL_CLASS}>Code</FieldLabel>
                <Input
                  {...field}
                  id="costcode-code"
                  placeholder="Enter cost code"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="costCodeCategoryId"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="costcode-category" className={FIELD_LABEL_CLASS}>
                  Category
                </FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger id="costcode-category" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="costcode-description" className={FIELD_LABEL_CLASS}>
                  Description
                </FieldLabel>
                <Input
                  {...field}
                  id="costcode-description"
                  value={field.value ?? ''}
                  placeholder="Enter description"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
