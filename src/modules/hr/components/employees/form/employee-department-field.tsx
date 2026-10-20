import { useState } from 'react';

import { FormFieldLabel } from '@/app/components/form-field-label';
import { Button } from '@/app/components/ui/button';
import { Field, FieldDescription } from '@/app/components/ui/field';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import { useDepartmentPickerOptions } from '@/modules/hr/hooks/use-department-picker-options';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import { Controller, type Control } from 'react-hook-form';

interface EmployeeDepartmentFieldProps {
  control: Control<CreateEmployeeInput>;
  /** The department the employee is in now, so it is named before the list loads. */
  currentDepartment?: { id: string; name: string } | null;
}

/**
 * Which department the employee belongs to — one at most, optional. Not the
 * auth role, which decides what their login may do.
 */
export function EmployeeDepartmentField({
  control,
  currentDepartment,
}: EmployeeDepartmentFieldProps) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<InfiniteSearchSelectOption | null>(null);
  const currentOption = currentDepartment
    ? { value: currentDepartment.id, label: currentDepartment.name }
    : null;
  const picker = useDepartmentPickerOptions({
    search,
    selectedOptions: currentOption ? [currentOption] : [],
    queryScope: 'employee-form',
  });

  return (
    <Controller
      name="departmentId"
      control={control}
      render={({ field }) => {
        const selectedOption =
          [picked, currentOption].find((option) => option?.value === field.value) ?? null;

        return (
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FormFieldLabel>Department</FormFieldLabel>
              {field.value ? (
                // Picking the chosen department again also clears it, but
                // nothing on screen says so.
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => field.onChange(null)}
                  aria-label="Clear department"
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <InfiniteSearchSelect
              options={picker.options}
              value={field.value || null}
              onValueChange={(value) => field.onChange(value ?? null)}
              onOptionChange={setPicked}
              selectedOption={selectedOption}
              search={search}
              onSearchChange={setSearch}
              isLoading={picker.isLoading}
              isFetchingNextPage={picker.isFetchingNextPage}
              hasNextPage={picker.hasNextPage}
              onFetchNextPage={picker.fetchNextPage}
              placeholder="No department"
              searchPlaceholder="Search departments..."
              emptyMessage="No departments found."
              loadingMessage="Loading departments..."
            />
            <FieldDescription>The team they work in. Leave empty for none.</FieldDescription>
          </Field>
        );
      }}
    />
  );
}
