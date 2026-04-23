import { useEffect, useState } from 'react';

import { Building2, Check, CircleUserRound, Mail, Phone, Plus, X } from 'lucide-react';
import { Controller } from 'react-hook-form';
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
import { TagInput } from '@app/components/ui/tag-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';
import { Switch } from '@app/components/ui/switch';

import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import { FormSectionNav } from '@app/components/form-section-nav';
import { QuickCreateVendorDialog } from '../components';
import { CONTACT_FORM_SECTIONS } from '../constants/contacts.constants';
import {
  useContactDetailQuery,
  useContactForm,
  useCreateContactMutation,
  useGCsQuery,
  useLinkEntityMutation,
  useProfessionalRolesQuery,
  useUpdateContactMutation,
  useVendorsQuery,
  useUnlinkEntityMutation,
} from '../hooks';
import type { ContactFormValues, CreateContactInput } from '../schemas/contact.schema';


/* ---- Page ---- */

export function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: contact, isLoading: isLoadingContact } = useContactDetailQuery(id ?? '');
  const { data: roles = [], isLoading: isLoadingRoles } = useProfessionalRolesQuery();
  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });
  const { data: gcsData } = useGCsQuery({ limit: 1000 });
  const createMutation = useCreateContactMutation();
  const updateMutation = useUpdateContactMutation();
  const linkEntityMutation = useLinkEntityMutation();
  const unlinkMutation = useUnlinkEntityMutation();


  const vendorOptions = (vendorsData?.data ?? []).map((v) => ({
    value: v.id,
    label: v.name,
  }));

  const gcOptions = (gcsData?.data ?? []).map((g) => ({
    value: g.id,
    label: g.name,
  }));

  // The backend may return `professionalRoleId: null` at the root level even
  // when the nested `professionalRole` object contains the real ID, so we
  // fall back to `professionalRole?.id` as the source of truth.
  const resolvedRoleId = (id: string | null | undefined, role?: { id: string } | null) =>
    id ?? role?.id ?? undefined;

  const { control, handleSubmit, reset, formState } = useContactForm(
    (isEdit && contact
      ? {
          fullName: contact.fullName,
          professionalRoleId: resolvedRoleId(contact.professionalRoleId, contact.professionalRole),
          email: contact.email?.[0],
          phoneNumber: contact.phoneNumber?.[0],
          tags: contact.tags ?? [],
        }
      : {
          fullName: '',
          professionalRoleId: undefined,
          email: undefined,
          phoneNumber: undefined,
          tags: [],
        }) as Partial<ContactFormValues>,
  );

  // Reset form when contact data loads in edit mode.
  // `roles` is included in the dependency array because the Select component
  // needs the options list to be present before it can display the selected
  // value — resetting again once roles arrive ensures the value shows up
  // regardless of which page the user navigated from (table vs detail page).
  useEffect(() => {
    if (isEdit && contact) {
      reset({
        fullName: contact.fullName,
        professionalRoleId: resolvedRoleId(contact.professionalRoleId, contact.professionalRole),
        email: contact.email?.[0],
        phoneNumber: contact.phoneNumber?.[0],
        tags: contact.tags ?? [],
      } as Partial<ContactFormValues>);
    }
  }, [isEdit, contact, roles, reset]);

  const [activeSection, setActiveSection] = useState<string>('contact-info');
  // Lazy initializer — safe because we return early while loading in edit mode,
  // so `contact` is already available by the time this renders.
  const [vendorLinks, setVendorLinks] = useState<{ vendorId: string; isPrimary: boolean }[]>(
    () => {
      if (!isEdit || !contact) return [];
      const links = (contact.vendorLinks ?? []).map((l) => ({ vendorId: l.vendorId, isPrimary: l.isPrimary }));
      // Include root-level vendor if present and not already in merged list
      if (contact.vendorId && !links.find(l => l.vendorId === contact.vendorId)) {
        links.push({ vendorId: contact.vendorId, isPrimary: true });
      }
      return links;
    }
  );
  const [gcLinks, setGCLinks] = useState<{ generalContractorId: string; isPrimary: boolean }[]>(
    () => {
      if (!isEdit || !contact) return [];
      const links = (contact.gcLinks ?? []).map((l) => ({
        generalContractorId: l.generalContractorId,
        isPrimary: l.isPrimary,
      }));
      // Include root-level GC if present and not already in merged list
      if (contact.generalContractorId && !links.find(l => l.generalContractorId === contact.generalContractorId)) {
        links.push({ generalContractorId: contact.generalContractorId, isPrimary: true });
      }
      return links;
    }
  );

  // Sync vendor links when contact data loads/updates in edit mode
  useEffect(() => {
    if (isEdit && contact) {
      const vl = (contact.vendorLinks ?? []).map((l) => ({ vendorId: l.vendorId, isPrimary: l.isPrimary }));
      if (contact.vendorId && !vl.find(l => l.vendorId === contact.vendorId)) {
        vl.push({ vendorId: contact.vendorId, isPrimary: true });
      }
      setVendorLinks(vl);

      const gl = (contact.gcLinks ?? []).map((l) => ({
        generalContractorId: l.generalContractorId,
        isPrimary: l.isPrimary,
      }));
      if (contact.generalContractorId && !gl.find(l => l.generalContractorId === contact.generalContractorId)) {
        gl.push({ generalContractorId: contact.generalContractorId, isPrimary: true });
      }
      setGCLinks(gl);
    }
  }, [isEdit, contact]);

  const [isSaving, setIsSaving] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  
  // States for association replacement confirmation
  const [pendingAssociation, setPendingAssociation] = useState<{ id: string; type: 'VENDOR' | 'GC' } | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  // States for unlinking confirmation
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [pendingUnlink, setPendingUnlink] = useState<{ index: number; type: 'VENDOR' | 'GC'; name: string } | null>(null);

  const currentAssociation = vendorLinks[0] 
    ? { id: vendorLinks[0].vendorId, name: vendorOptions.find(v => v.value === vendorLinks[0].vendorId)?.label || 'Current Vendor', type: 'VENDOR' }
    : gcLinks[0]
    ? { id: gcLinks[0].generalContractorId, name: gcOptions.find(g => g.value === gcLinks[0].generalContractorId)?.label || 'Current GC', type: 'GC' }
    : null;

  const handleAddAssociation = (id: string, type: 'VENDOR' | 'GC') => {
    if (currentAssociation) {
      setPendingAssociation({ id, type });
      setShowReplaceConfirm(true);
    } else {
      if (type === 'VENDOR') {
        setVendorLinks([{ vendorId: id, isPrimary: true }]);
      } else {
        setGCLinks([{ generalContractorId: id, isPrimary: true }]);
      }
    }
  };

  const confirmReplace = () => {
    if (!pendingAssociation) return;
    
    // Clear all existing
    setVendorLinks([]);
    setGCLinks([]);
    
    if (pendingAssociation.type === 'VENDOR') {
      setVendorLinks([{ vendorId: pendingAssociation.id, isPrimary: true }]);
    } else {
      setGCLinks([{ generalContractorId: pendingAssociation.id, isPrimary: true }]);
    }
    
    setPendingAssociation(null);
    setShowReplaceConfirm(false);
  };

  const handleUnlinkClick = (index: number, type: 'VENDOR' | 'GC', name: string) => {
    setPendingUnlink({ index, type, name });
    setShowUnlinkConfirm(true);
  };

  const confirmUnlink = () => {
    if (!pendingUnlink) return;
    if (pendingUnlink.type === 'VENDOR') {
      setVendorLinks((prev) => prev.filter((_, i) => i !== pendingUnlink.index));
    } else {
      setGCLinks((prev) => prev.filter((_, i) => i !== pendingUnlink.index));
    }
    setPendingUnlink(null);
    setShowUnlinkConfirm(false);
  };

  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const handleFillRandom = () => {
    const randomSuffix = Math.floor(Math.random() * 1000);
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    reset({
      fullName: `Test Contact ${randomSuffix}`,
      professionalRoleId: randomRole?.id,
      email: { email: `test-${randomSuffix}@example.com`, label: 'Work' },
      phoneNumber: {
        number: `(555) 000-${randomSuffix.toString().padStart(4, '0')}`,
        label: 'Office',
      },
      tags: ['Test', 'Random'],
    } as Partial<ContactFormValues>);
    toast.info('Form filled with test data.');
  };

  const handleVendorCreated = (vendor: { id: string; name: string }) => {
    setVendorLinks((prev) => [...prev, { vendorId: vendor.id, isPrimary: false }]);
  };

  const onSubmit = async (formData: ContactFormValues) => {
    const email = formData.email?.email || undefined;
    const phoneNumber = formData.phoneNumber?.number || undefined;

    const primaryVendorId =
      vendorLinks.find((l) => l.isPrimary)?.vendorId || vendorLinks[0]?.vendorId;
    const primaryGCId =
      gcLinks.find((l) => l.isPrimary)?.generalContractorId || gcLinks[0]?.generalContractorId;

    if (isEdit && id) {
      setIsSaving(true);
      try {
        // 1. PUT basic contact fields.
        await updateMutation.mutateAsync({
          id,
          data: {
            fullName: formData.fullName,
            professionalRoleId: formData.professionalRoleId ?? null,
            email,
            phoneNumber,
            tags: formData.tags,
            // We still send these in the body if the PUT supports them
            vendorId: primaryVendorId,
            generalContractorId: primaryGCId,
          },
        });

        // 2. Explicitly call the link or unlink endpoint to ensure the association is set correctly.
        //    The backend says it's mutually exclusive.
        if (primaryVendorId || primaryGCId) {
          await linkEntityMutation.mutateAsync({
            contactId: id,
            vendorId: primaryVendorId,
            generalContractorId: primaryGCId,
          });
        } else if (isEdit) {
          // If editing and no association is selected, ensure it's cleared on the backend.
          try {
            await unlinkMutation.mutateAsync(id);
          } catch (err) {
            console.error('Failed to unlink entity:', err);
            // We don't necessarily want to block the whole update if unlink fails
            // but the user should be aware if it's critical.
          }
        }

        toast.success('Contact updated successfully.');
        navigate('..', { relative: 'path' });
      } catch {
        // Mutation onError handlers already show toasts
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsSaving(true);
      try {
        const payload: CreateContactInput = {
          fullName: formData.fullName,
          professionalRoleId: formData.professionalRoleId ?? undefined,
          email,
          phoneNumber,
          tags: formData.tags,
          vendorId: primaryVendorId,
          generalContractorId: primaryGCId,
        };

        const newContact = await createMutation.mutateAsync(payload);
        const newId = newContact.id;

        // Explicitly call the link endpoint for the new contact.
        if (primaryVendorId || primaryGCId) {
          await linkEntityMutation.mutateAsync({
            contactId: newId,
            vendorId: primaryVendorId,
            generalContractorId: primaryGCId,
          });
        }

        toast.success('Contact created successfully.');
        navigate('..', { relative: 'path' });
      } catch {
        // Mutation onError handlers already show toasts
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Wait for both contact data AND roles to load before rendering the form.
  // This guarantees useContactForm initialises with the correct professionalRoleId
  // as its defaultValues, so the Radix Select displays the pre-selected value
  // correctly regardless of which navigation path (table vs detail page) was used.
  if (isEdit && (isLoadingContact || isLoadingRoles)) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading contact...</div>
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
                Directory
              </Link>
              {' / '}
              <Link to=".." relative="path" className="hover:text-foreground">
                Contacts
              </Link>
            </div>
            <ToolbarPageTitle>{isEdit ? 'Edit Contact' : 'Add New Contact'}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update the contact information below.'
                : 'Register a new individual and associate them with a vendor.'}
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
              size="sm"
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(onSubmit)()}
            >
              <Check className="size-4" />
              {isEdit ? 'Save Changes' : 'Create Contact'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* Main layout: top nav + content */}
      <FormSectionNav
        sections={CONTACT_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
          {/* ---- Section: Contact Info ---- */}
          <Card id="contact-info">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Contact Info</h2>
                <p className="text-sm text-muted-foreground">
                  Core identity and professional details.
                </p>
              </div>

              <Separator />

              {/* Row 1: Name + Role */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="fullName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Full Name
                      </FieldLabel>
                      <InputWrapper>
                        <CircleUserRound className="size-4" />
                        <Input
                          {...field}
                          placeholder="e.g. Michael Chen"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="professionalRoleId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Professional Role
                      </FieldLabel>
                      <Select
                        key={`${roles.length}-${field.value || 'none'}`}
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(v || undefined)}
                      >
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-muted-foreground" />
                            <SelectValue placeholder="Select role..." />
                          </div>
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
              </div>

              {/* Row 2: Email + Phone */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => {
                    const emailValue = field.value?.email ?? '';
                    return (
                      <Field data-invalid={fieldState.invalid || !!formState.errors.email}>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Email Address
                        </FieldLabel>
                        <InputWrapper>
                          <Mail className="size-4" />
                          <Input
                            type="email"
                            value={emailValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(
                                val ? { email: val, label: 'Work' } : undefined,
                              );
                            }}
                            placeholder="m.chen@company.com"
                            aria-invalid={fieldState.invalid || !!formState.errors.email}
                            autoComplete="off"
                          />
                        </InputWrapper>
                        {fieldState.error && <FieldError errors={[fieldState.error]} />}
                        {!fieldState.error && formState.errors.email && (
                          <FieldError errors={[formState.errors.email]} />
                        )}
                      </Field>
                    );
                  }}
                />

                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field, fieldState }) => {
                    const phoneValue = field.value?.number ?? '';
                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Direct Phone
                        </FieldLabel>
                        <InputWrapper>
                          <Phone className="size-4" />
                          <Input
                            type="tel"
                            value={phoneValue}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^+\d\s\-().]/g, '');
                              field.onChange(
                                val ? { number: val, label: 'Office' } : undefined,
                              );
                            }}
                            placeholder="(555) 000-0000"
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                          />
                        </InputWrapper>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    );
                  }}
                />
              </div>

              {/* Row 3: Tags */}
              <Controller
                name="tags"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Tags
                    </FieldLabel>
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      placeholder="e.g. Decision Maker, Finance..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Press Enter or comma to add a tag.
                    </p>
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          {/* ---- Section: External Association ---- */}
          <Card id="association">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">External Association</h2>
                <p className="text-sm text-muted-foreground">
                  Link this contact to one or more vendors or general contractors.
                </p>
              </div>

              <Separator />

              {/* Vendors Sub-section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Vendors</h3>
                
                {/* Linked vendors list */}
                {vendorLinks.length > 0 && (
                  <div className="space-y-2">
                    {vendorLinks.map((link, index) => {
                      const vendorName =
                        vendorOptions.find((v) => v.value === link.vendorId)?.label ??
                        link.vendorId;
                      return (
                        <div
                          key={link.vendorId}
                          className="flex items-center gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3"
                        >
                          <Building2 className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-sm font-medium text-foreground">
                            {vendorName}
                          </span>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            Primary
                            <Switch
                              checked={link.isPrimary}
                              onCheckedChange={(checked) =>
                                setVendorLinks((prev) =>
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
                              handleUnlinkClick(index, 'VENDOR', vendorName)
                            }
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add vendor select */}
                <Field>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                    Add Vendor
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={vendorOptions.filter(
                          (v) => !vendorLinks.some((l) => l.vendorId === v.value),
                        )}
                        value={null}
                        onValueChange={(vendorId) => {
                          if (vendorId) {
                            handleAddAssociation(vendorId, 'VENDOR');
                          }
                        }}
                        placeholder="Search Vendors..."
                        searchPlaceholder="Search vendors..."
                        emptyMessage="No vendors found."
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVendorDialogOpen(true)}
                    >
                      <Plus className="size-4" />
                      Create Vendor
                    </Button>
                  </div>
                </Field>
              </div>

              <Separator />

              {/* GCs Sub-section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">General Contractors</h3>
                
                {/* Linked GCs list */}
                {gcLinks.length > 0 && (
                  <div className="space-y-2">
                    {gcLinks.map((link, index) => {
                      const gcName =
                        gcOptions.find((g) => g.value === link.generalContractorId)?.label ??
                        link.generalContractorId;
                      return (
                        <div
                          key={link.generalContractorId}
                          className="flex items-center gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3"
                        >
                          <Building2 className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-sm font-medium text-foreground">
                            {gcName}
                          </span>
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            Primary
                            <Switch
                              checked={link.isPrimary}
                              onCheckedChange={(checked) =>
                                setGCLinks((prev) =>
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
                              handleUnlinkClick(index, 'GC', gcName)
                            }
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add gc select */}
                <Field>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                    Add GC
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={gcOptions.filter(
                          (g) => !gcLinks.some((l) => l.generalContractorId === g.value),
                        )}
                        value={null}
                        onValueChange={(generalContractorId) => {
                          if (generalContractorId) {
                            handleAddAssociation(generalContractorId, 'GC');
                          }
                        }}
                        placeholder="Search GCs..."
                        searchPlaceholder="Search GCs..."
                        emptyMessage="No GCs found."
                      />
                    </div>
                  </div>
                </Field>
              </div>
            </CardContent>
          </Card>
      </div>

    </form>

    <QuickCreateVendorDialog
      open={vendorDialogOpen}
      onOpenChange={setVendorDialogOpen}
      onCreated={handleVendorCreated}
    />

    <ConfirmDialog
      open={showReplaceConfirm}
      onOpenChange={setShowReplaceConfirm}
      title="Change Association?"
      description={
        <>
          This contact is already linked to <strong>{currentAssociation?.name}</strong>. 
          Do you want to replace it with <strong>{pendingAssociation?.type === 'VENDOR' ? vendorOptions.find(v => v.value === pendingAssociation?.id)?.label : gcOptions.find(g => g.value === pendingAssociation?.id)?.label}</strong>?
          <br /><br />
          Contacts can only be linked to one Vendor or GC at a time.
        </>
      }
      confirmLabel="Replace Association"
      onConfirm={confirmReplace}
      variant="primary"
    />

    <ConfirmDialog
      open={showUnlinkConfirm}
      onOpenChange={setShowUnlinkConfirm}
      title="Remove Association?"
      description={
        <>
          Are you sure you want to remove the association with <strong>{pendingUnlink?.name}</strong>? 
          <br /><br />
          This contact will no longer be linked to this {pendingUnlink?.type === 'VENDOR' ? 'Vendor' : 'General Contractor'}.
        </>
      }
      confirmLabel="Remove"
      onConfirm={confirmUnlink}
      variant="destructive"
    />
    </>
  );
}
