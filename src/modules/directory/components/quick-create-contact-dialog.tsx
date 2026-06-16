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
  useCreateContactMutation,
  useProfessionalRolesQuery,
} from '@/modules/directory/hooks/contacts.hooks';
import {
  quickCreateContactSchema,
  type QuickCreateContactValues,
} from '@/modules/directory/schemas/contact.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

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
  const { data: roles = [] } = useProfessionalRolesQuery();

  const { control, handleSubmit, reset, formState } = useForm<QuickCreateContactValues>({
    resolver: zodResolver(quickCreateContactSchema),
    defaultValues: {
      fullName: '',
      professionalRoleId: undefined,
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({ fullName: '', professionalRoleId: undefined, email: '', phone: '' });
    }
  }, [open, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSubmit = async (data: QuickCreateContactValues, e?: BaseSyntheticEvent) => {
    e?.stopPropagation();
    const created = await createMutation.mutateAsync({
      fullName: data.fullName,
      professionalRoleId: data.professionalRoleId || undefined,
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
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Professional Role
                </FieldLabel>
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                >
                  <SelectTrigger aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.label || role.name || role.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
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
