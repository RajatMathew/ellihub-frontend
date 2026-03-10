import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Check, CircleUserRound, FileText, Globe, Mail, Phone, Plus, X } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';
import { Switch } from '@app/components/ui/switch';

import { FormSectionNav } from '@app/components/form-section-nav';
import { QuickCreateContactDialog } from '../components';
import { GC_FORM_SECTIONS, GC_STATUS_OPTIONS } from '../constants/gc.constants';
import { PAYMENT_TERMS_OPTIONS } from '../constants/shared.constants';
import {
  useAddGCContactLinkMutation,
  useContactsQuery,
  useCreateGCMutation,
  useGCDetailQuery,
  useGCTypesQuery,
  useRemoveGCContactLinkMutation,
  useUpdateGCMutation,
} from '../hooks';
import {
  gcFormSchema,
  type GCContactLink,
  type GCFormValues,
  type GCStatus,
  type PaymentTerms,
} from '../schemas/gc.schema';

/* ---- Helpers ---- */

function getContactName(
  contactId: string,
  originalLinks: GCContactLink[],
  contactsData: { id: string; fullName: string }[],
): string {
  const fromLink = originalLinks.find((l) => l.contactId === contactId);
  if (fromLink) return fromLink.contact.fullName;
  const fromQuery = contactsData.find((c) => c.id === contactId);
  return fromQuery?.fullName ?? contactId;
}

/* ---- Page ---- */

export function GCFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Queries
  const { data: gcDetail, isLoading: isLoadingGC } = useGCDetailQuery(id ?? '');
  const { data: gcTypes = [] } = useGCTypesQuery();
  const { data: contactsData } = useContactsQuery({ size: 1000 });

  // Mutations
  const createMutation = useCreateGCMutation();
  const updateMutation = useUpdateGCMutation();
  const addContactLinkMutation = useAddGCContactLinkMutation();
  const removeContactLinkMutation = useRemoveGCContactLinkMutation();

  // Contact options for SearchableSelect
  const contactOptions = (contactsData?.data ?? []).map((c) => ({
    value: c.id,
    label: c.fullName,
  }));

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
    },
  });

  // Contact links state — unified source of truth
  const [contactLinks, setContactLinks] = useState<
    { contactId: string; isPrimary: boolean }[]
  >([]);
  // Server snapshot for diffing on save (edit mode)
  const [originalLinks, setOriginalLinks] = useState<GCContactLink[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

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
      });
      const activeLinks = (gcDetail.contactLinks ?? []).filter(
        (l) => !l.contact.deletedAt,
      );
      setOriginalLinks(activeLinks);
      setContactLinks(
        activeLinks.map((l) => ({ contactId: l.contactId, isPrimary: l.isPrimary })),
      );
    }
  }, [isEdit, gcDetail, reset]);

  const [activeSection, setActiveSection] = useState<string>('info');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const handleContactCreated = (contact: { id: string; fullName: string }) => {
    setContactLinks((prev) => [...prev, { contactId: contact.id, isPrimary: false }]);
  };

  const onSubmit = async (formData: GCFormValues) => {
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
        // 1. Update GC fields
        await updateMutation.mutateAsync({ id, data: payload });

        // 2. Compute contact link diff
        const originalByContact = new Map(
          originalLinks.map((l) => [l.contactId, l]),
        );
        const currentByContact = new Map(
          contactLinks.map((l) => [l.contactId, l]),
        );

        const toRemove = originalLinks.filter(
          (l) => !currentByContact.has(l.contactId),
        );
        const toAdd = contactLinks.filter(
          (l) => !originalByContact.has(l.contactId),
        );

        const linkOps: Promise<unknown>[] = [
          ...toRemove.map((link) =>
            removeContactLinkMutation.mutateAsync({ gcId: id, linkId: link.id }),
          ),
          ...toAdd.map((link) =>
            addContactLinkMutation.mutateAsync({
              gcId: id,
              data: { contactId: link.contactId, isPrimary: link.isPrimary },
            }),
          ),
        ];

        if (linkOps.length > 0) {
          const results = await Promise.allSettled(linkOps);
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length > 0) {
            toast.error(`${failures.length} contact link operation(s) failed.`);
            return;
          }
        }

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
        // 1. Create GC
        const created = await createMutation.mutateAsync(payload);

        // 2. Link selected contacts via GC-side API
        if (contactLinks.length > 0) {
          const linkOps = contactLinks.map((link) =>
            addContactLinkMutation.mutateAsync({
              gcId: created.id,
              data: { contactId: link.contactId, isPrimary: link.isPrimary },
            }),
          );
          const results = await Promise.allSettled(linkOps);
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length > 0) {
            toast.error(`${failures.length} contact link(s) failed to save.`);
          }
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

      {/* Main layout: top nav + content */}
      <FormSectionNav
        sections={GC_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
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
                        <Input {...field} placeholder="https://..." aria-invalid={fieldState.invalid} autoComplete="off" />
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
                          aria-invalid={fieldState.invalid}
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
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Company Phone
                      </FieldLabel>
                      <InputWrapper>
                        <Phone className="size-4" />
                        <Input
                          {...field}
                          onChange={(e) =>
                            field.onChange(e.target.value.replace(/[^+\d\s\-().]/g, ''))
                          }
                          type="tel"
                          placeholder="(555) 000-0000"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
              <div>
                <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                  GC Team Directory
                </h2>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">
                  Define key points of contact within the GC organization.
                </p>
              </div>

              <Separator />

              {/* Linked contacts list */}
              {contactLinks.length > 0 && (
                <div className="space-y-2">
                  {contactLinks.map((link, index) => {
                    const name = getContactName(
                      link.contactId,
                      originalLinks,
                      contactsData?.data ?? [],
                    );
                    return (
                      <div
                        key={link.contactId}
                        className="flex items-center gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3"
                      >
                        <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium text-foreground">
                          {name}
                        </span>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Primary
                          <Switch
                            checked={link.isPrimary}
                            onCheckedChange={(checked) =>
                              setContactLinks((prev) =>
                                prev.map((l, i) =>
                                  i === index ? { ...l, isPrimary: checked } : l,
                                ),
                              )
                            }
                          />
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          mode="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setContactLinks((prev) => prev.filter((_, i) => i !== index))
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add contact select */}
              <Field>
                <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                  Add Contact
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={contactOptions.filter(
                        (c) => !contactLinks.some((l) => l.contactId === c.value),
                      )}
                      value={null}
                      onValueChange={(contactId) => {
                        if (contactId) {
                          setContactLinks((prev) => [
                            ...prev,
                            { contactId, isPrimary: false },
                          ]);
                        }
                      }}
                      placeholder="Search Contacts..."
                      searchPlaceholder="Search contacts..."
                      emptyMessage="No contacts found."
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setContactDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                    Create Contact
                  </Button>
                </div>
              </Field>

              {contactLinks.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No contacts linked yet. Search above or create a new contact.
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

      <QuickCreateContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onCreated={handleContactCreated}
      />
    </form>
  );
}
