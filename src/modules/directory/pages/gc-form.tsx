import { useCallback, useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Check, FileText, Globe, Mail, Phone, Plus, Trash2 } from 'lucide-react';
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
  useCreateGCMutation,
  useGCDetailQuery,
  useGCTypesQuery,
  useProfessionalRolesQuery,
  useRemoveGCContactLinkMutation,
  useUpdateGCMutation,
} from '../hooks';
import type { GCContactLink, GCStatus, PaymentTerms } from '../schemas/gc.schema';

/* ---- Form schema ---- */

const gcFormSchema = z.object({
  name: z.string().min(1, 'GC name is required'),
  gcTypeId: z.string().min(1, 'GC type is required'),
  website: z.string(),
  status: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  paymentTerms: z.string(),
  retainagePercent: z.number().min(0).max(100),
  contacts: z.array(
    z.object({
      fullName: z.string().min(1, 'Name is required'),
      professionalRoleId: z.string(),
      email: z.string(),
      phone: z.string(),
    })
  ),
});

type GCFormValues = z.infer<typeof gcFormSchema>;

/* ---- Sidebar sections ---- */

const SECTIONS = [
  { id: 'info', label: 'Info' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'compliance-docs', label: 'Compliance Docs' },
] as const;

const GC_STATUS_OPTIONS: { value: GCStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PROSPECTING', label: 'Prospect' },
  { value: 'INACTIVE', label: 'Inactive' },
];

/* ---- Page ---- */

export function GCFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Queries
  const { data: gcDetail, isLoading: isLoadingGC } = useGCDetailQuery(id ?? '');
  const { data: gcTypes = [] } = useGCTypesQuery();
  const { data: roles = [] } = useProfessionalRolesQuery();

  // Mutations
  const createMutation = useCreateGCMutation();
  const updateMutation = useUpdateGCMutation();
  const removeContactLinkMutation = useRemoveGCContactLinkMutation();

  // Form setup
  const { control, handleSubmit, reset } = useForm<GCFormValues>({
    resolver: zodResolver(gcFormSchema),
    defaultValues: {
      name: '',
      gcTypeId: '',
      website: '',
      status: 'ACTIVE',
      email: '',
      phone: '',
      address: '',
      paymentTerms: 'NET_30',
      retainagePercent: 10,
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
  const [existingLinks, setExistingLinks] = useState<GCContactLink[]>([]);

  // Reset form when GC data loads in edit mode
  useEffect(() => {
    if (isEdit && gcDetail) {
      reset({
        name: gcDetail.name,
        gcTypeId: gcDetail.gcTypeId,
        website: gcDetail.website ?? '',
        status: gcDetail.status,
        email: gcDetail.email ?? '',
        phone: gcDetail.phone ?? '',
        address: gcDetail.address ?? '',
        paymentTerms: gcDetail.paymentTerms,
        retainagePercent: gcDetail.retainagePercent,
        contacts: [],
      });
      setExistingLinks((gcDetail.contactLinks ?? []).filter((l) => !l.contact.deletedAt));
    }
  }, [isEdit, gcDetail, reset]);

  const [activeSection, setActiveSection] = useState<string>('info');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const handleRemoveExistingLink = useCallback(
    (linkId: string) => {
      if (!id) return;
      removeContactLinkMutation.mutate(
        { gcId: id, linkId },
        {
          onSuccess: () => {
            setExistingLinks((prev) => prev.filter((l) => l.id !== linkId));
            toast.success('Contact removed.');
          },
        }
      );
    },
    [id, removeContactLinkMutation]
  );

  const onSubmit = async (formData: GCFormValues) => {
    // Clean up empty contacts
    const validContacts = formData.contacts.filter((c) => c.fullName.trim());

    const payload = {
      name: formData.name,
      gcTypeId: formData.gcTypeId,
      website: formData.website || undefined,
      status: formData.status as GCStatus,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      paymentTerms: formData.paymentTerms as PaymentTerms,
      retainagePercent: formData.retainagePercent,
    };

    if (isEdit && id) {
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({ id, data: payload });
        toast.success('General contractor updated.');
        navigate('..', { relative: 'path' });
      } catch {
        // Error toast shown by mutation
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(true);
      try {
        const created = await createMutation.mutateAsync(payload);

        // Add contact links for new contacts (create contact first, then link)
        // Since the API auto-creates contacts when using /contacts endpoint,
        // we'll skip inline contact creation for now — contacts should be
        // linked via the existing contacts directory after GC is created.
        if (validContacts.length > 0) {
          console.info(
            '[GC Form] Inline contacts provided but contacts should be linked from directory. Skipping auto-creation.'
          );
        }

        toast.success('General contractor created.');
        navigate(`../${created.id}`, { relative: 'path' });
      } catch {
        // Error toast shown by mutation
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isEdit && isLoadingGC) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading general contractor...</div>
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
                General Contractors
              </Link>
              {' / '}
              <span>{isEdit ? 'Edit' : 'New GC'}</span>
            </div>
            <ToolbarPageTitle>
              {isEdit ? 'Edit General Contractor' : 'Add General Contractor'}
            </ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update the general contractor information below.'
                : 'Register a new General Contractor to track volume, projects, and compliance documents.'}
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
              {isEdit ? 'Save Changes' : 'Create GC'}
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
          {/* ---- Section: General Information ---- */}
          <Card id="info">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                  General Information
                </h2>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">
                  Core entity details and classification.
                </p>
              </div>

              <Separator />

              {/* Row 1: Name + Type */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        GC Name
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          placeholder="e.g. Navillus Inc."
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="gcTypeId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        GC Type
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {gcTypes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Row 2: Website + Status */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="website"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Official Website
                      </FieldLabel>
                      <InputWrapper>
                        <Globe className="size-4" />
                        <Input {...field} placeholder="https://..." autoComplete="off" />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Initial Status
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {GC_STATUS_OPTIONS.map((opt) => (
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

              {/* Row 3: Email + Phone */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Company Email
                      </FieldLabel>
                      <InputWrapper>
                        <Mail className="size-4" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="info@company.com"
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Company Phone
                      </FieldLabel>
                      <InputWrapper>
                        <Phone className="size-4" />
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 000-0000"
                          autoComplete="off"
                        />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Row 4: Address */}
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Address
                    </FieldLabel>
                    <InputWrapper>
                      <Building2 className="size-4" />
                      <Input
                        {...field}
                        placeholder="200 Commerce St, Dallas TX 75201"
                        autoComplete="off"
                      />
                    </InputWrapper>
                  </Field>
                )}
              />

              {/* Row 5: Payment Terms + Retainage */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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

                <Controller
                  name="retainagePercent"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Retainage %
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="10"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ---- Section: GC Team Directory ---- */}
          <Card id="contacts">
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                    GC Team Directory
                  </h2>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">
                    Define key points of contact within the GC organization.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    appendContact({
                      fullName: '',
                      professionalRoleId: '',
                      email: '',
                      phone: '',
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
                            <Input value={link.contact.fullName} disabled className="bg-muted" />
                          </InputWrapper>
                        </Field>
                        <Field>
                          <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                            Organization Role
                          </FieldLabel>
                          <Input
                            value={
                              roles.find((r) => r.id === link.contact.professionalRoleId)?.name ??
                              '—'
                            }
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
                            Phone Connection
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
                          {contactNumber === 1 && (
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
                              <Input {...f} placeholder="Full Name" autoComplete="off" />
                            </InputWrapper>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name={`contacts.${index}.professionalRoleId`}
                        control={control}
                        render={({ field: f }) => (
                          <Field>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Organization Role
                            </FieldLabel>
                            <Select value={f.value} onValueChange={f.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role..." />
                              </SelectTrigger>
                              <SelectContent>
                                {roles.map((role) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.name}
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
                                placeholder="email@gc.com"
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
                              Phone Connection
                            </FieldLabel>
                            <InputWrapper>
                              <Phone className="size-4" />
                              <Input
                                {...f}
                                type="tel"
                                placeholder="(xxx) xxx-xxxx"
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

          {/* ---- Section: Master Compliance Documents (Deferred) ---- */}
          <Card id="compliance-docs">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                  Master Compliance Documents
                </h2>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">
                  Track enterprise-level agreements and safety records.
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
