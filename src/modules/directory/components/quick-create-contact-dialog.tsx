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
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  useCreateContactMutation,
  useProfessionalRolesQuery,
} from '@/modules/directory/hooks/contacts.hooks';
import {
  quickCreateContactSchema,
  type QuickCreateContactValues,
} from '@/modules/directory/schemas/contact.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useController, useForm } from 'react-hook-form';

export function QuickCreateContactDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (contact: { id: string; fullName: string }) => void;
}) {
  const createMutation = useCreateContactMutation();
  const { data: roles = [], isLoading: isRolesLoading } = useProfessionalRolesQuery();
  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.label || role.name || role.id,
  }));

  const { control, handleSubmit, reset, formState } = useForm<QuickCreateContactValues>({
    resolver: zodResolver(quickCreateContactSchema),
    defaultValues: {
      fullName: '',
      professionalRoleId: undefined,
      professionalRoleLabel: '',
      email: '',
      phone: '',
    },
  });
  const { field: roleLabelField, fieldState: roleLabelFieldState } = useController({
    control,
    name: 'professionalRoleLabel',
  });

  useEffect(() => {
    if (open) {
      reset({
        fullName: '',
        professionalRoleId: undefined,
        professionalRoleLabel: '',
        email: '',
        phone: '',
      });
    }
  }, [open, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = async (data: QuickCreateContactValues, e?: BaseSyntheticEvent) => {
    e?.stopPropagation();
    const professionalRoleLabel = data.professionalRoleLabel?.trim() || undefined;
    const created = await createMutation.mutateAsync({
      fullName: data.fullName,
      professionalRoleId: professionalRoleLabel ? undefined : data.professionalRoleId || undefined,
      professionalRoleLabel,
      email: data.email || undefined,
      phoneNumber: data.phone || undefined,
    });
    onCreated({ id: created.id, fullName: created.fullName });
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-wider">
            New Contact
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit, onInvalidFormSubmit)} className="space-y-4">
          <Controller
            name="fullName"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </FieldLabel>
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
                  <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Professional Role
                  </FieldLabel>
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
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </FieldLabel>
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
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </FieldLabel>
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
              {createMutation.isPending ? 'Creating...' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
