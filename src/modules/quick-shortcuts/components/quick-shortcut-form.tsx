import { useEffect, useMemo } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import type { AccessContextValue } from '@/app/contexts/access-context';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  getQuickShortcutDestination,
  QUICK_SHORTCUT_DESTINATIONS,
} from '@/modules/quick-shortcuts/constants/quick-shortcut-destinations';
import {
  normalizeExternalUrl,
  quickShortcutFormSchema,
  type QuickShortcut,
  type QuickShortcutFormInput,
  type QuickShortcutFormValues,
  type QuickShortcutWriteInput,
} from '@/modules/quick-shortcuts/schemas/quick-shortcut.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, LayoutGrid } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';

type QuickShortcutFormProps = {
  shortcut: QuickShortcut | null;
  access: AccessContextValue;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: QuickShortcutWriteInput) => void;
};

function getDefaultValues(shortcut: QuickShortcut | null): QuickShortcutFormInput {
  if (shortcut?.destinationType === 'EXTERNAL') {
    return {
      name: shortcut.name,
      destinationType: 'EXTERNAL',
      internalPath: '',
      externalUrl: shortcut.externalUrl ?? '',
      openInNewTab: shortcut.openInNewTab,
    };
  }

  return {
    name: shortcut?.name ?? '',
    destinationType: 'INTERNAL',
    internalPath: shortcut?.internalPath ?? '',
    externalUrl: '',
    openInNewTab: shortcut?.openInNewTab ?? false,
  };
}

export function QuickShortcutForm({
  shortcut,
  access,
  isSubmitting,
  onCancel,
  onSubmit,
}: QuickShortcutFormProps) {
  const { control, formState, getValues, handleSubmit, reset, setValue } = useForm<
    QuickShortcutFormInput,
    unknown,
    QuickShortcutFormValues
  >({
    resolver: zodResolver(quickShortcutFormSchema),
    defaultValues: getDefaultValues(shortcut),
  });
  const destinationType = useWatch({ control, name: 'destinationType' });
  const availableDestinations = useMemo(
    () => QUICK_SHORTCUT_DESTINATIONS.filter((destination) => destination.canAccess(access)),
    [access]
  );
  const destinationOptions = useMemo(
    () =>
      availableDestinations.map((destination) => ({
        value: destination.path,
        label: destination.label,
        badge: destination.group,
      })),
    [availableDestinations]
  );

  useEffect(() => {
    reset(getDefaultValues(shortcut));
  }, [reset, shortcut]);

  const submit = (values: QuickShortcutFormValues) => {
    const name = values.name.trim();
    if (values.destinationType === 'INTERNAL') {
      onSubmit({
        name,
        destinationType: 'INTERNAL',
        internalPath: values.internalPath,
        openInNewTab: values.openInNewTab,
      });
      return;
    }

    onSubmit({
      name,
      destinationType: 'EXTERNAL',
      externalUrl: normalizeExternalUrl(values.externalUrl),
      openInNewTab: values.openInNewTab,
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(submit, onInvalidFormSubmit)}>
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="quick-shortcut-name">Name</FieldLabel>
            <Input
              id="quick-shortcut-name"
              {...field}
              autoFocus
              maxLength={60}
              placeholder="e.g. Vendor portal"
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
          </Field>
        )}
      />

      <Controller
        name="destinationType"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>Destination type</FieldLabel>
            <RadioGroup
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                if (value === 'INTERNAL') {
                  setValue('externalUrl', '', { shouldValidate: false });
                } else {
                  setValue('internalPath', '', { shouldValidate: false });
                }
              }}
              className="grid-cols-1 sm:grid-cols-2"
            >
              <Label
                htmlFor="shortcut-type-internal"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50 has-data-[state=checked]:border-primary"
              >
                <RadioGroupItem id="shortcut-type-internal" value="INTERNAL" />
                <LayoutGrid className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Elli page</span>
              </Label>
              <Label
                htmlFor="shortcut-type-external"
                className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/50 has-data-[state=checked]:border-primary"
              >
                <RadioGroupItem id="shortcut-type-external" value="EXTERNAL" />
                <ExternalLink className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Web link</span>
              </Label>
            </RadioGroup>
          </Field>
        )}
      />

      {destinationType === 'INTERNAL' ? (
        <Controller
          name="internalPath"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Elli page</FieldLabel>
              <SearchableSelect
                options={destinationOptions}
                value={field.value || null}
                onValueChange={(value) => {
                  field.onChange(value ?? '');
                  const destination = getQuickShortcutDestination(value);
                  if (destination && !getValues('name').trim()) {
                    setValue('name', destination.label, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
                placeholder="Select a page"
                searchPlaceholder="Search Elli pages..."
                emptyMessage="No available pages found."
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      ) : (
        <Controller
          name="externalUrl"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="quick-shortcut-url">Web address</FieldLabel>
              <Input
                id="quick-shortcut-url"
                {...field}
                inputMode="url"
                placeholder="https://example.com"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
            </Field>
          )}
        />
      )}

      <Controller
        name="openInNewTab"
        control={control}
        render={({ field }) => (
          <Label
            htmlFor="quick-shortcut-new-tab"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"
          >
            <Checkbox
              id="quick-shortcut-new-tab"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Open in a new tab</span>
              <span className="block text-xs font-normal text-muted-foreground">
                Leave off to open the shortcut in the current tab.
              </span>
            </span>
          </Label>
        )}
      />

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !formState.isDirty}>
          {isSubmitting ? 'Saving...' : shortcut ? 'Save changes' : 'Add shortcut'}
        </Button>
      </div>
    </form>
  );
}
