import { useCallback, useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, Globe, Mail, Phone, Plus, Trash2, User } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';

import { FormSectionNav } from '../components';
import { PAYMENT_TERMS_OPTIONS } from '../constants/shared.constants';
import {
  useCreateVendorMutation,
  useDeleteVendorContactMutation,
  useUpdateVendorMutation,
  useVendorDetailQuery,
} from '../hooks';
import type {
  PaymentTerms,
  VendorContactLink,
  VendorStatus,
  VendorType,
} from '../schemas/vendor.schema';

/* ---- Form schema ---- */

const vendorFormSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  type: z.string().min(1, 'Vendor type is required'),
  status: z.string(),
  taxId: z.string(),
  website: z.string(),
  paymentTerms: z.string(),
  contacts: z.array(
    z.object({
      fullName: z.string().min(1, 'Name is required'),
      role: z.string(),
      email: z.string(),
      phone: z.string(),
      isPrimary: z.boolean(),
    })
  ),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

/* ---- Sidebar sections ---- */

const SECTIONS = [
  { id: 'info', label: 'Info' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'compliance-docs', label: 'Compliance Docs' },
] as const;

const VENDOR_TYPE_OPTIONS: { value: VendorType; label: string }[] = [
  { value: 'MATERIAL', label: 'Material Vendor' },
  { value: 'FABRICATION', label: 'Fabrication' },
  { value: 'INSTALLATION', label: 'Installation' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
];

const VENDOR_STATUS_OPTIONS: { value: VendorStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROSPECT', label: 'Prospect' },
  { value: 'BLACKLISTED', label: 'Blacklisted' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const CONTACT_ROLE_OPTIONS = [
  'Primary Contact',
  'Accounts Payable',
  'Estimator',
  'Project Manager',
  'Sales Rep',
  'Operations',
];

/* ---- Page ---- */

export function VendorFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Queries
  const { data: vendorDetail, isLoading: isLoadingVendor } = useVendorDetailQuery(id ?? '');

  // Mutations
  const createMutation = useCreateVendorMutation();
  const updateMutation = useUpdateVendorMutation();
  const removeContactMutation = useDeleteVendorContactMutation();

  // Form setup
  const { control, handleSubmit, reset } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      type: 'MATERIAL',
      status: 'ACTIVE',
      taxId: '',
      website: '',
      paymentTerms: 'NET_30',
      contacts: [],
    },
  });

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control,
    name: 'contacts',
  });

  // Existing contact links state (edit mode)
  const [existingLinks, setExistingLinks] = useState<VendorContactLink[]>([]);

  // Reset form when vendor data loads in edit mode
  useEffect(() => {
    if (isEdit && vendorDetail) {
      reset({
        name: vendorDetail.name,
        type: vendorDetail.type,
        status: vendorDetail.status,
        taxId: vendorDetail.taxId ?? '',
        website: vendorDetail.website ?? '',
        paymentTerms: vendorDetail.paymentTerms,
        contacts: [],
      });
      setExistingLinks(
        (vendorDetail.contactLinks ?? []).filter((l) => !l.contact?.deletedAt)
      );
    }
  }, [isEdit, vendorDetail, reset]);

  const [activeSection, setActiveSection] = useState<string>('info');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const handleRemoveExistingLink = useCallback(
    (contactId: string) => {
      if (!id) return;
      removeContactMutation.mutate(
        { id, contactId },
        {
          onSuccess: () => {
            setExistingLinks((prev) => prev.filter((l) => l.id !== contactId));
            toast.success('Contact removed.');
          },
        }
      );
    },
    [id, removeContactMutation]
  );

  const onSubmit = async (formData: VendorFormValues) => {
    const validContacts = formData.contacts.filter((c) => c.fullName.trim());

    if (isEdit && id) {
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({
          id,
          data: {
            name: formData.name,
            type: formData.type as VendorType,
            status: formData.status as VendorStatus,
            taxId: formData.taxId || null,
            website: formData.website || null,
            paymentTerms: formData.paymentTerms as PaymentTerms,
          },
        });
        toast.success('Vendor updated.');
        navigate('..', { relative: 'path' });
      } catch {
        // Error toast shown by mutation
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(true);
      try {
        const created = await createMutation.mutateAsync({
          name: formData.name,
          type: formData.type as VendorType,
          status: formData.status as VendorStatus,
          taxId: formData.taxId || undefined,
          website: formData.website || undefined,
          paymentTerms: formData.paymentTerms as PaymentTerms,
          contacts: validContacts.map((c, i) => ({
            fullName: c.fullName,
            role: c.role || undefined,
            email: c.email || undefined,
            phone: c.phone || undefined,
            isPrimary: c.isPrimary || i === 0,
          })),
        });

        toast.success('Vendor created.');
        navigate(`../${created.id}`, { relative: 'path' });
      } catch {
        // Error toast shown by mutation
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isEdit && isLoadingVendor) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading vendor...</div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errors) => console.warn('Validation errors:', errors))}
      className="container-fluid py-7.5"
    >
      {/* Toolbar */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Directory
              </Link>
              {' / '}
              <span>{isEdit ? 'Edit' : 'New Vendor'}</span>
            </div>
            <ToolbarPageTitle>
              {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
            </ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update vendor profile and contact information.'
                : 'Create a new vendor profile with compliance tracking and multi-contact support.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">
                Cancel
              </Link>
            </Button>
            <Button variant="outline" size="sm" type="submit" disabled={isSubmitting}>
              Save as Draft
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isEdit ? 'Save Changes' : 'Create Vendor'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Separator />

      {/* Main layout: sidebar nav + content */}
      <div className="flex gap-8 pt-8">
        {/* Left sidebar nav */}
        <FormSectionNav
          sections={SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* ---- Section: Info ---- */}
          <Card id="info">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                  Info
                </h2>
                <p className="text-sm text-muted-foreground">
                  Corporate identity and system status.
                </p>
              </div>

              <Separator />

              {/* Row 1: Vendor Name + Vendor Type */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Vendor Name
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          placeholder="e.g. Acme Construction Services"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="type"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Vendor Type
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {VENDOR_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Row 2: Default Status + Tax ID */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Default Status
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VENDOR_STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />

                <Controller
                  name="taxId"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Tax ID / EIN{' '}
                        <span className="text-muted-foreground font-normal">(Optional)</span>
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          placeholder="XX-XXXXXXX"
                          autoComplete="off"
                        />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Row 3: Website + Payment Terms */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="website"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Website
                      </FieldLabel>
                      <InputWrapper>
                        <Globe className="size-4" />
                        <Input {...field} placeholder="https://..." autoComplete="off" />
                      </InputWrapper>
                    </Field>
                  )}
                />

                <Controller
                  name="paymentTerms"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Payment Terms
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TERMS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ---- Section: Contacts ---- */}
          <Card id="contacts">
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                    Contacts
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage multiple points of contact for this vendor.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendContact({
                      fullName: '',
                      role: '',
                      email: '',
                      phone: '',
                      isPrimary: existingLinks.length === 0 && contactFields.length === 0,
                    })
                  }
                >
                  <Plus className="size-4" />
                  Add Contact
                </Button>
              </div>

              <Separator />

              {/* Existing contact links (edit mode) */}
              {existingLinks.length > 0 && (
                <div className="space-y-4">
                  {existingLinks.map((link, index) => (
                    <div key={link.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-10 rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                            {index + 1}
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-foreground">
                              Contact #{index + 1}
                            </span>
                            {link.isPrimary && (
                              <Badge
                                variant="success"
                                appearance="light"
                                size="sm"
                                className="ml-2"
                              >
                                Primary Contact
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          mode="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveExistingLink(link.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Field>
                          <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                            Full Name
                          </FieldLabel>
                          <InputWrapper>
                            <User className="size-4" />
                            <Input value={link.contact.fullName} disabled className="bg-muted" />
                          </InputWrapper>
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                            Role / Title
                          </FieldLabel>
                          <Input
                            value={link.isPrimary ? 'Primary Contact' : '—'}
                            disabled
                            className="bg-muted"
                          />
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                            Email Address
                          </FieldLabel>
                          <InputWrapper>
                            <Mail className="size-4" />
                            <Input
                              value={link.contact.email?.email ?? ''}
                              disabled
                              className="bg-muted"
                            />
                          </InputWrapper>
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                            Phone Number
                          </FieldLabel>
                          <InputWrapper>
                            <Phone className="size-4" />
                            <Input
                              value={link.contact.phoneNumber?.phone ?? ''}
                              disabled
                              className="bg-muted"
                            />
                          </InputWrapper>
                        </Field>
                      </div>

                      {index < existingLinks.length - 1 && <Separator />}
                    </div>
                  ))}
                  {contactFields.length > 0 && <Separator />}
                </div>
              )}

              {/* New contacts (field array) */}
              {contactFields.map((field, index) => {
                const contactNumber = existingLinks.length + index + 1;
                const isFirstContact = existingLinks.length === 0 && index === 0;
                return (
                  <div key={field.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                          {contactNumber}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            Contact #{contactNumber}
                          </span>
                          {isFirstContact && (
                            <Badge variant="success" appearance="light" size="sm" className="ml-2">
                              Primary Contact
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeContact(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <Controller
                        name={`contacts.${index}.fullName`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Full Name
                            </FieldLabel>
                            <InputWrapper>
                              <User className="size-4" />
                              <Input {...f} placeholder="John Doe" autoComplete="off" />
                            </InputWrapper>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name={`contacts.${index}.role`}
                        control={control}
                        render={({ field: f }) => (
                          <Field>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Role / Title
                            </FieldLabel>
                            <Select value={f.value} onValueChange={f.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role..." />
                              </SelectTrigger>
                              <SelectContent>
                                {CONTACT_ROLE_OPTIONS.map((role) => (
                                  <SelectItem key={role} value={role}>
                                    {role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      />

                      <Controller
                        name={`contacts.${index}.email`}
                        control={control}
                        render={({ field: f }) => (
                          <Field>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Email Address
                            </FieldLabel>
                            <InputWrapper>
                              <Mail className="size-4" />
                              <Input
                                {...f}
                                type="email"
                                placeholder="email@company.com"
                                autoComplete="off"
                              />
                            </InputWrapper>
                          </Field>
                        )}
                      />

                      <Controller
                        name={`contacts.${index}.phone`}
                        control={control}
                        render={({ field: f }) => (
                          <Field>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Phone Number
                            </FieldLabel>
                            <InputWrapper>
                              <Phone className="size-4" />
                              <Input
                                {...f}
                                type="tel"
                                placeholder="(XXX) xxx-xxxx"
                                autoComplete="off"
                              />
                            </InputWrapper>
                          </Field>
                        )}
                      />
                    </div>

                    {index < contactFields.length - 1 && <Separator />}
                  </div>
                );
              })}

              {existingLinks.length === 0 && contactFields.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No contacts added yet. Click &quot;+ Add Contact&quot; above to add one.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ---- Section: Compliance Docs (Future Update) ---- */}
          <Card id="compliance-docs">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                  Compliance Docs
                </h2>
                <p className="text-sm text-muted-foreground">
                  Track insurance and legal documentation status.
                </p>
              </div>

              <Separator />

              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <FileText className="size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Compliance document tracking will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
