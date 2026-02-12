import { Controller } from 'react-hook-form';

import { Button } from '@app/components/ui/button';
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

export function CostCodesForm({
  onSubmit,
  defaultValues,
  onCancel,
}: {
  onSubmit: (data: CostCodeCreate | CostCode) => void;
  onCancel?: () => void;
  defaultValues?: Partial<CostCodeCreate> | Partial<CostCode>;
}) {
  const { control, handleSubmit } = useCostCodeForm(defaultValues);
  const { data: categories = [], isLoading: categoriesLoading } = useCostCodeCategoriesQuery();

  const isEditing = defaultValues && 'id' in defaultValues && defaultValues.id;

  return (
    <form
      onSubmit={handleSubmit(
        (data) => onSubmit(data),
        (errors) => console.warn('Form errors', errors)
      )}
    >
      <div className="container-fluid py-6">
        <div className="max-w-lg overflow-hidden rounded-sm border border-gray-200 bg-background shadow-sm">
          <div className="border-b border-gray-200 bg-gray-900 px-5 py-3">
            <h2 className="text-[13px] font-bold tracking-[0.05em] text-white uppercase">
              {isEditing ? 'Edit Cost Code' : 'New Cost Code'}
            </h2>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                  >
                    Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
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
                    htmlFor={field.name}
                    className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                  >
                    Code
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
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
                    htmlFor={field.name}
                    className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                  >
                    Category
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={categoriesLoading}
                  >
                    <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
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
                    htmlFor={field.name}
                    className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase"
                  >
                    Description
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    value={field.value ?? ''}
                    placeholder="Enter description"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <div className="flex gap-2 border-t border-gray-200 px-6 py-4">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              Save
            </Button>
            <Button
              type="button"
              onClick={() => onCancel?.()}
              variant="outline"
              size="sm"
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
