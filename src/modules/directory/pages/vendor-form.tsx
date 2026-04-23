import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CircleUserRound, FileText, Globe, Plus, X } from 'lucide-react';
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
import { PAYMENT_TERMS_OPTIONS } from '../constants/shared.constants';
import {
  VENDOR_FORM_SECTIONS,
  VENDOR_STATUS_OPTIONS,
  VENDOR_TYPE_OPTIONS,
} from '../constants/vendors.constants';
import {
  useContactsQuery,
  useCreateVendorMutation,
  useUnlinkEntityMutation,
  useLinkEntityMutation,
  useUpdateVendorMutation,
  useVendorDetailQuery,
  useVendorTypesQuery,
} from '../hooks';
import {
  vendorFormSchema,
  type PaymentTerms,
  type VendorContactLink,
  type VendorFormValues,
  type VendorStatus,
  type VendorTypeObject,
} from '../schemas/vendor.schema';

/* ---- Helpers ---- */

function getContactName(
  contactId: string,
  originalLinks: VendorContactLink[],
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

export function VendorFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Queries
  const { data: vendorDetail, isLoading: isLoadingVendor } = useVendorDetailQuery(id ?? '');
  const { data: contactsData } = useContactsQuery({ size: 1000 });
  const { data: apiTypes } = useVendorTypesQuery();

  // Mutations
  const createMutation = useCreateVendorMutation();
  const updateMutation = useUpdateVendorMutation();
  const unlinkEntityMutation = useUnlinkEntityMutation();
  const linkEntityMutation = useLinkEntityMutation();

  // Contact options for SearchableSelect
  const contactOptions = (contactsData?.data ?? []).map((c) => ({
    value: c.id,
    label: c.fullName,
  }));

  // Form setup
  const { control, handleSubmit, reset } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: '',
      type: '',
      status: 'ACTIVE',
      taxId: '',
      website: '',
      paymentTerms: 'NET_30',
    },
  });

  // Contact links state — unified source of truth
  const [contactLinks, setContactLinks] = useState<{ contactId: string; isPrimary: boolean }[]>([]);
  // Server snapshot for diffing on save (edit mode)
  const [originalLinks, setOriginalLinks] = useState<VendorContactLink[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  // Track if we have performed the initial form population to avoid wiping user changes
  const [isInitialized, setIsInitialized] = useState(false);

  // Reset form when vendor data loads in edit mode
  useEffect(() => {
    if (isEdit && vendorDetail && !isInitialized) {
      const typeValue =
        vendorDetail.typeId ||
        (typeof vendorDetail.type === 'object' ? vendorDetail.type?.id : vendorDetail.type) ||
        '';

      reset({
        name: vendorDetail.name,
        website: vendorDetail.website ?? '',
        paymentTerms: vendorDetail.paymentTerms ?? '',
        type: typeValue,
        status: vendorDetail.status,
        taxId: vendorDetail.taxId ?? '',
      });
      // Consolidate contacts from both legacy links and new direct array
      const resolvedLinks: VendorContactLink[] = [...(vendorDetail.contactLinks ?? [])];
      
      // Add contacts from the direct array if they are not already represented in links
      if (vendorDetail.contacts && vendorDetail.contacts.length > 0) {
        vendorDetail.contacts.forEach((contact) => {
          if (!resolvedLinks.some((l) => l.contactId === contact.id)) {
            resolvedLinks.push({
              id: contact.id, // Fallback to contact ID if link ID is missing
              contactId: contact.id,
              vendorId: vendorDetail.id,
              isPrimary: (contact as any).isPrimary || false,
              contact: contact,
            } as VendorContactLink);
          }
        });
      }

      setOriginalLinks(resolvedLinks);
      setContactLinks(
        resolvedLinks.map((l) => ({ contactId: l.contactId, isPrimary: !!l.isPrimary }))
      );
      setIsInitialized(true);
    }
  }, [isEdit, vendorDetail, reset, apiTypes, isInitialized]);

  const [activeSection, setActiveSection] = useState<string>('info');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const fillRandom = () => {
    const randomId = Math.floor(Math.random() * 10000);
    const randomType = apiTypes?.[Math.floor(Math.random() * (apiTypes?.length || 1))]?.id;

    reset({
      name: `Random Vendor ${randomId}`,
      type: randomType ?? 'MATERIAL',
      status: (['ACTIVE', 'INACTIVE'] as const)[Math.floor(Math.random() * 2)],
      taxId: `${Math.floor(10 + Math.random() * 89)}-${Math.floor(
        1000000 + Math.random() * 8999999
      )}`,
      website: `https://vendor-${randomId}.com`,
      paymentTerms: 'NET_30',
    });
  };

  const handleContactCreated = (contact: { id: string; fullName: string }) => {
    setContactLinks((prev) => [...prev, { contactId: contact.id, isPrimary: false }]);
  };

  const onSubmit = async (formData: VendorFormValues) => {
    if (isEdit && id) {
      setIsSaving(true);
      try {
        // 1. Update vendor fields
        await updateMutation.mutateAsync({
          id,
          data: {
            name: formData.name,
            typeId: formData.type || undefined,
            status: formData.status as VendorStatus,
            taxId: formData.taxId || null,
            website: formData.website || null,
            paymentTerms: formData.paymentTerms as PaymentTerms,
          },
        });

        // 2. Compute contact link diff
        const originalByContact = new Map(originalLinks.map((l) => [l.contactId, l]));
        const currentByContact = new Map(contactLinks.map((l) => [l.contactId, l]));

        const toRemove = originalLinks.filter((l) => !currentByContact.has(l.contactId));
        const toAdd = contactLinks.filter((l) => !originalByContact.has(l.contactId));

        const linkOps: Promise<unknown>[] = [
          ...toRemove.map((link) => unlinkEntityMutation.mutateAsync(link.contactId)),
          ...toAdd.map((link) =>
            linkEntityMutation.mutateAsync({
              contactId: link.contactId,
              vendorId: id,
            })
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
        // 1. Create vendor
        const created = await createMutation.mutateAsync({
          name: formData.name,
          typeId: formData.type || undefined,
          status: formData.status as VendorStatus,
          taxId: formData.taxId || undefined,
          website: formData.website || undefined,
          paymentTerms: formData.paymentTerms as PaymentTerms,
        });

        // 2. Link selected contacts via contact-side API
        if (contactLinks.length > 0) {
          const linkOps = contactLinks.map((link) =>
            linkEntityMutation.mutateAsync({
              contactId: link.contactId,
              vendorId: created.id,
            })
          );
          const results = await Promise.allSettled(linkOps);
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length > 0) {
            toast.error(`${failures.length} contact link(s) failed to save.`);
          }
        }

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
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Directory
              </Link>
              {' / '}
              <span>{isEdit ? 'Edit' : 'New Vendor'}</span>
            </div>
            <ToolbarPageTitle>{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update vendor profile and contact information.'
                : 'Create a new vendor profile with compliance tracking and multi-contact support.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            {!isEdit && (
              <Button variant="outline" size="sm" type="button" onClick={fillRandom}>
                Fill Random
              </Button>
            )}
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

      {/* Main layout: top nav + content */}
      <FormSectionNav
        sections={VENDOR_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
        {/* ---- Section: Info ---- */}
        <Card id="info">
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                Info
              </h2>
              <p className="text-sm text-muted-foreground">Corporate identity and system status.</p>
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
                    <Select
                      key={`type-${field.value}`}
                      value={field.value || ''}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="Select vendor type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(apiTypes && apiTypes.length > 0
                          ? (apiTypes as VendorTypeObject[]).map((t) => ({
                              value: t.id,
                              label: t.label || t.name,
                            }))
                          : VENDOR_TYPE_OPTIONS
                        ).map((opt) => {
                          const val =
                            typeof opt.value === 'string'
                              ? opt.value
                              : (opt.value as VendorTypeObject).id;
                          return (
                            <SelectItem key={val} value={val}>
                              {opt.label}
                            </SelectItem>
                          );
                        })}
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
                render={({ field }) => {
                  return (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Default Status
                      </FieldLabel>
                      <Select
                        key={`status-${field.value}`}
                        value={field.value || ''}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status..." />
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
                  );
                }}
              />

              <Controller
                name="taxId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Tax ID / EIN{' '}
                      <span className="text-muted-foreground font-normal">(Optional)</span>
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/[^\d-]/g, ''))}
                        placeholder="12-3456789"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        maxLength={10}
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            {/* Row 3: Website + Payment Terms */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Controller
                name="website"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Website
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
            </div>
          </CardContent>
        </Card>

        {/* ---- Section: Contacts ---- */}
        <Card id="contacts">
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                Contacts
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage multiple points of contact for this vendor.
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

      <QuickCreateContactDialog
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        onCreated={handleContactCreated}
      />
    </form>
  );
}
