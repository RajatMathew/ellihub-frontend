import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/app/components/ui/form';
import { Input } from '@/app/components/ui/input';
import { useCreateQuickBooksVendorMutation } from '@/modules/integrations/hooks/quickbooks.hooks';
import type {
  QuickBooksCreateVendorResult,
  QuickBooksPayee,
  QuickBooksVendorMapping,
} from '@/modules/integrations/schemas/quickbooks.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

interface DbVendorForQuickBooks {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

const createQuickBooksVendorFormSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.'),
  companyName: z.string().trim().optional(),
  primaryEmail: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || z.string().email().safeParse(value).success, {
      message: 'Enter a valid email address.',
    }),
  primaryPhone: z.string().trim().optional(),
  saveMapping: z.boolean(),
});

type CreateQuickBooksVendorFormData = z.infer<typeof createQuickBooksVendorFormSchema>;

interface CreateQuickBooksVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: DbVendorForQuickBooks;
  onCreated: (
    vendor: QuickBooksPayee,
    mapping: QuickBooksVendorMapping | null,
    result: QuickBooksCreateVendorResult
  ) => void;
}

function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function CreateQuickBooksVendorDialog({
  open,
  onOpenChange,
  vendor,
  onCreated,
}: CreateQuickBooksVendorDialogProps) {
  const createVendor = useCreateQuickBooksVendorMutation();
  const form = useForm<CreateQuickBooksVendorFormData>({
    resolver: zodResolver(createQuickBooksVendorFormSchema),
    defaultValues: {
      displayName: vendor.name,
      companyName: vendor.name,
      primaryEmail: vendor.email ?? '',
      primaryPhone: vendor.phone ?? '',
      saveMapping: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      displayName: vendor.name,
      companyName: vendor.name,
      primaryEmail: vendor.email ?? '',
      primaryPhone: vendor.phone ?? '',
      saveMapping: true,
    });
  }, [form, open, vendor.email, vendor.name, vendor.phone]);

  const handleSubmit = async (values: CreateQuickBooksVendorFormData) => {
    const result = await createVendor.mutateAsync({
      displayName: values.displayName,
      companyName: normalizeOptional(values.companyName),
      primaryEmail: normalizeOptional(values.primaryEmail),
      primaryPhone: normalizeOptional(values.primaryPhone),
      vendorId: vendor.id,
      saveMapping: values.saveMapping,
    });
    onCreated(result.vendor, result.mapping, result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create QuickBooks Vendor</DialogTitle>
          <DialogDescription>
            Add this vendor to QuickBooks and optionally remember the mapping.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
            <DialogBody className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Display Name</FieldLabel>
                    <Input {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Company Name</FieldLabel>
                    <Input {...field} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="primaryEmail"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Email</FieldLabel>
                      <Input {...field} type="email" aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primaryPhone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Phone</FieldLabel>
                      <Input {...field} aria-invalid={fieldState.invalid} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="saveMapping"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                    </FormControl>
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Save vendor mapping</FormLabel>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Future payments for {vendor.name} will auto-select this QuickBooks vendor.
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createVendor.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={createVendor.isPending}>
                {createVendor.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Building2 className="size-4" />
                )}
                Create Vendor
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
