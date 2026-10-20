import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { useProfessionalRolesQuery } from '@/modules/directory/hooks/contacts.hooks';
import type { QuickCreateContactValues } from '@/modules/directory/schemas/contact.schema';
import { Controller, useController, useFormState, type Control } from 'react-hook-form';

const LABEL_CLASS_NAME = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground';

/** The fields of the quick contact dialogs: name, professional role, email and phone. */
export function ContactQuickFields({ control }: { control: Control<QuickCreateContactValues> }) {
  const { data: roles = [], isLoading: isRolesLoading } = useProfessionalRolesQuery();
  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.label || role.name || role.id,
  }));
  const formState = useFormState({ control });
  const { field: roleLabelField, fieldState: roleLabelFieldState } = useController({
    control,
    name: 'professionalRoleLabel',
  });

  return (
    <>
      <Controller
        name="fullName"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className={LABEL_CLASS_NAME}>Full Name</FieldLabel>
            <Input
              {...field}
              placeholder="Enter full name"
              autoComplete="off"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        name="professionalRoleId"
        control={control}
        render={({ field, fieldState }) => {
          const isInvalid = fieldState.invalid || roleLabelFieldState.invalid;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className={LABEL_CLASS_NAME}>Professional Role</FieldLabel>
              <SearchableSelect
                options={roleOptions}
                value={field.value ?? ''}
                onValueChange={(value) => {
                  field.onChange(value || undefined);
                  if (value) roleLabelField.onChange('');
                }}
                allowCustomValue
                customValue={roleLabelField.value ?? ''}
                onCustomValueChange={(value) => {
                  roleLabelField.onChange(value || '');
                  if (value) field.onChange(undefined);
                }}
                customValueLabel={(value) => `Use "${value}" as professional role`}
                placeholder={isRolesLoading ? 'Loading roles...' : 'Select or type role...'}
                searchPlaceholder="Search or type role..."
                emptyMessage="No contact roles found."
                disabled={isRolesLoading}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              {!fieldState.invalid && roleLabelFieldState.invalid && (
                <FieldError errors={[roleLabelFieldState.error]} />
              )}
            </Field>
          );
        }}
      />

      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || !!formState.errors.email}>
            <FieldLabel className={LABEL_CLASS_NAME}>Email</FieldLabel>
            <Input
              {...field}
              type="email"
              placeholder="email@company.com"
              autoComplete="off"
              aria-invalid={fieldState.invalid || !!formState.errors.email}
            />
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
            {!fieldState.error && formState.errors.email && (
              <FieldError errors={[formState.errors.email]} />
            )}
          </Field>
        )}
      />

      <Controller
        name="phone"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className={LABEL_CLASS_NAME}>Phone</FieldLabel>
            <Input
              {...field}
              onChange={(e) => field.onChange(e.target.value.replace(/[^+\d\s\-().]/g, ''))}
              type="tel"
              placeholder="(555) 000-0000"
              autoComplete="off"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </>
  );
}
