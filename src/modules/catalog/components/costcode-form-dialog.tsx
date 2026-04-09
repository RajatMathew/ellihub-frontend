import { useEffect } from 'react';
import { Controller } from 'react-hook-form';

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
import { useCostCodeCategoriesQuery, useCostCodeForm } from '@modules/catalog/hooks';
import type { CostCode, CostCodeCreate } from '@modules/catalog/schemas/costcode.schema';

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
          <DialogTitle className="text-[13px] font-bold tracking-[0.05em] uppercase">
            {isEditing ? 'Edit Cost Code' : 'New Cost Code'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(
            (data) => onSubmit(data as CostCodeCreate | CostCode),
            () => {}
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
                <FieldLabel
                  htmlFor="costcode-name"
                  className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                >
                  Name
                </FieldLabel>
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
                <FieldLabel
                  htmlFor="costcode-code"
                  className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                >
                  Code
                </FieldLabel>
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
                <FieldLabel
                  htmlFor="costcode-category"
                  className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                >
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
                <FieldLabel
                  htmlFor="costcode-description"
                  className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                >
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
              disabled={isSubmitting}
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
