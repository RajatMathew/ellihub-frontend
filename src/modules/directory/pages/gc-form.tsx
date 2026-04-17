import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Check,
  CircleUserRound,
  FileText,
  Globe,
  Mail,
  Phone,
  Plus,
  X,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { FormSectionNav } from '@app/components/form-section-nav';
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

import { QuickCreateContactDialog } from '../components';
import { GC_FORM_SECTIONS, GC_STATUS_OPTIONS } from '../constants/gc.constants';
import { PAYMENT_TERMS_OPTIONS } from '../constants/shared.constants';
import {
  useAddGCContactLinkMutation,
  useContactsQuery,
  useCreateGCMutation,
  useGCDetailQuery,
  useGCTypesQuery,
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
  contactsData: { id: string; fullName: string }[]
): string {
  const fromLink = originalLinks.find((l) => l.contactId === contactId);
  if (fromLink && fromLink.contact && fromLink.contact.fullName) {
    return fromLink.contact.fullName;
  }
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

  // Contact options for SearchableSelect
  const contactOptions = (contactsData?.data ?? []).map((c) => ({
    value: c.id,
    label: c.fullName,
  }));

  // Form setup
  const { control, handleSubmit, reset, watch, setValue } = useForm<GCFormValues>({
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
  const [contactLinks, setContactLinks] = useState<{ contactId: string; isPrimary: boolean }[]>([]);
  // Server snapshot for diffing on save (edit mode)
  const [originalLinks, setOriginalLinks] = useState<GCContactLink[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  // Track if we have performed the initial form population to avoid wiping user changes
  const [isInitialized, setIsInitialized] = useState(false);

  // Reset form when GC data loads in edit mode
  useEffect(() => {
    if (isEdit && gcDetail && !isInitialized) {
      reset({
        name: gcDetail.name,
        gcTypeId: gcDetail.gcTypeId || gcDetail.gcType?.id || '',
        website: gcDetail.website ?? '',
        status: gcDetail.status,
        email: gcDetail.email ?? '',
        phone: gcDetail.phone ?? '',
        address: gcDetail.address ?? '',
        paymentTerms: gcDetail.paymentTerms ?? '',
        retainagePercent: gcDetail.retainagePercent,
      });
      const activeLinks = gcDetail.contactLinks ?? [];
      setOriginalLinks(activeLinks);
      setContactLinks(activeLinks.map((l) => ({ contactId: l.contactId, isPrimary: !!l.isPrimary })));
      setIsInitialized(true);
    }
  }, [isEdit, gcDetail, reset, isInitialized]);

  // Special sync for gcTypeId if it arrived late in gcTypes
  useEffect(() => {
    if (isEdit && gcDetail && gcTypes.length > 0 && !watch('gcTypeId')) {
      setValue('gcTypeId', gcDetail.gcTypeId || gcDetail.gcType?.id || '');
    }
  }, [gcTypes.length, isEdit, gcDetail, setValue, watch]);

  const gcTypeOptions = useMemo(
    () =>
      gcTypes.map((t) => ({
        value: t.id,
        label: t.label || t.name || 'Unknown',
      })),
    [gcTypes]
  );

  const [activeSection, setActiveSection] = useState<string>('info');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const handleContactCreated = (contact: { id: string; fullName: string }) => {
    setContactLinks((prev) => [...prev, { contactId: contact.id, isPrimary: false }]);
  };

  const handleFillRandom = () => {
    if (gcTypes.length === 0) {
      toast.error('No GC types available to pick from.');
      return;
    }
    const randomType = gcTypes[Math.floor(Math.random() * gcTypes.length)];
    const randomSuffix = Math.floor(Math.random() * 1000);
    reset({
      name: `Test GC ${randomSuffix}`,
      gcTypeId: randomType.id,
      website: `https://test-gc-${randomSuffix}.com`,
      status: 'ACTIVE',
      email: `test-${randomSuffix}@example.com`,
      phone: `(555) 000-${randomSuffix.toString().padStart(4, '0')}`,
      address: `${randomSuffix} Test Parkway, Dallas TX 75201`,
      paymentTerms: 'NET_30',
      retainagePercent: 10,
    });
    toast.info('Form filled with test data.');
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

        // 2. Re-add all contact links (the PUT replaces/clears them)
        if (contactLinks.length > 0) {
          const linkOps = contactLinks.map((link) =>
            addContactLinkMutation.mutateAsync({
              gcId: id,
              data: { contactId: link.contactId, isPrimary: link.isPrimary },
            })
          );
          const results = await Promise.allSettled(linkOps);
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length > 0) {
            toast.error(`${failures.length} contact link(s) failed to save.`);
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
            })
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
    <>
      <form
        onSubmit={handleSubmit(onSubmit, (errors) => console.warn('Validation errors:', errors))}
        className="container-fluid py-7.5"
      >
        {/* Toolbar */}
        <Toolbar sticky={false}>
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
              <Button variant="outline" size="sm" type="button" onClick={handleFillRandom}>
                Fill Random
              </Button>
              <Button variant="outline" size="sm" type="button" asChild>
                <Link to=".." relative="path">
                  Cancel
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(onSubmit)()}
              >
                Save as Draft
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(onSubmit)()}
              >
                <Check className="size-4" />
                {isEdit ? 'Save Changes' : 'Create GC'}
              </Button>
            </ToolbarActions>
          </ToolbarWrapper>
        </Toolbar>

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
                      <SearchableSelect
                        options={gcTypeOptions}
                        value={field.value || null}
                        onValueChange={(val) => field.onChange(val || '')}
                        placeholder="Select GC type..."
                        searchPlaceholder="Search types..."
                        emptyMessage="No types found."
                        disabled={gcTypes.length === 0}
                      />
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
                        <Input
                          {...field}
                          placeholder="https://..."
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
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
                      <Select
                        key={`status-${field.value}`}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
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
                      <Select
                        key={`terms-${field.value}`}
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms..." />
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
                      contactsData?.data ?? []
                    );
                    return (
                      <div
                        key={link.contactId}
                        className="flex items-center gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3"
                      >
                        <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium text-foreground">{name}</span>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          Primary
                          <Switch
                            checked={!!link.isPrimary}
                            onCheckedChange={(checked) =>
                              setContactLinks((prev) =>
                                prev.map((l, i) => (i === index ? { ...l, isPrimary: checked } : l))
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
                        (c) => !contactLinks.some((l) => l.contactId === c.value)
                      )}
                      value={null}
                      onValueChange={(contactId) => {
                        if (contactId) {
                          setContactLinks((prev) => [...prev, { contactId, isPrimary: false }]);
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
      </form>

      <QuickCreateContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onCreated={handleContactCreated}
      />
    </>
  );
}
