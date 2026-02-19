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

import { FormSectionNav, QuickCreateVendorDialog } from '../components';
import { CONTACT_FORM_SECTIONS } from '../constants/contacts.constants';
import {
  useAddVendorLinkMutation,
  useContactDetailQuery,
  useContactForm,
  useCreateContactMutation,
  useProfessionalRolesQuery,
  useRemoveVendorLinkMutation,
  useUpdateContactMutation,
  useVendorsQuery,
} from '../hooks';
import type { Contact, ContactVendorLink, CreateContactInput } from '../schemas/contact.schema';

/* ---- Helpers ---- */

function computeVendorLinkDiff(
  original: ContactVendorLink[],
  current: { vendorId: string; isPrimary: boolean }[],
) {
  const originalByVendor = new Map(original.map((l) => [l.vendorId, l]));
  const currentByVendor = new Map(current.map((l) => [l.vendorId, l]));

  const toRemove = original.filter((l) => !currentByVendor.has(l.vendorId));
  const toAdd = current.filter((l) => !originalByVendor.has(l.vendorId));
  const toUpdate = current.filter((l) => {
    const orig = originalByVendor.get(l.vendorId);
    return orig && orig.isPrimary !== l.isPrimary;
  });

  return { toRemove, toAdd, toUpdate };
}

/* ---- Page ---- */

export function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: contact, isLoading: isLoadingContact } = useContactDetailQuery(id ?? '');
  const { data: roles = [] } = useProfessionalRolesQuery();
  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });
  const createMutation = useCreateContactMutation();
  const updateMutation = useUpdateContactMutation();
  const addVendorLinkMutation = useAddVendorLinkMutation();
  const removeVendorLinkMutation = useRemoveVendorLinkMutation();

  const vendorOptions = (vendorsData?.data ?? []).map((v) => ({
    value: v.id,
    label: v.name,
  }));

  const { control, handleSubmit, reset, formState } = useContactForm(
    isEdit && contact
      ? contact
      : {
          fullName: '',
          professionalRoleId: undefined,
          email: undefined,
          phoneNumber: undefined,
          tags: [],
        },
  );

  // Reset form when contact data loads in edit mode
  useEffect(() => {
    if (isEdit && contact) {
      reset(contact);
    }
  }, [isEdit, contact, reset]);

  const [activeSection, setActiveSection] = useState<string>('contact-info');
  // Lazy initializer — safe because we return early while loading in edit mode,
  // so `contact` is already available by the time this renders.
  const [vendorLinks, setVendorLinks] = useState<{ vendorId: string; isPrimary: boolean }[]>(
    () =>
      isEdit && contact
        ? (contact.vendorLinks ?? []).map((l) => ({ vendorId: l.vendorId, isPrimary: l.isPrimary }))
        : [],
  );

  const [isSaving, setIsSaving] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const handleVendorCreated = (vendor: { id: string; name: string }) => {
    setVendorLinks((prev) => [...prev, { vendorId: vendor.id, isPrimary: false }]);
  };

  const onSubmit = async (formData: CreateContactInput | Contact) => {
    const payload: CreateContactInput = {
      fullName: formData.fullName,
      professionalRoleId: formData.professionalRoleId ?? undefined,
      email: formData.email?.email ? formData.email : undefined,
      phoneNumber: formData.phoneNumber?.phone ? formData.phoneNumber : undefined,
      tags: formData.tags,
      vendorLinks: vendorLinks.length > 0 ? vendorLinks : [],
    };

    if (isEdit && id) {
      setIsSaving(true);
      try {
        // 1. PUT basic contact fields
        await updateMutation.mutateAsync({
          id,
          data: {
            fullName: payload.fullName,
            professionalRoleId: payload.professionalRoleId ?? null,
            email: payload.email ?? null,
            phoneNumber: payload.phoneNumber ?? null,
            tags: payload.tags,
          },
        });

        // 2. Persist vendor link changes via sub-resource APIs
        const originalLinks = contact?.vendorLinks ?? [];
        const { toRemove, toAdd, toUpdate } = computeVendorLinkDiff(originalLinks, vendorLinks);

        const linkOps: Promise<Contact>[] = [
          ...toRemove.map((link) =>
            removeVendorLinkMutation.mutateAsync({ contactId: id, linkId: link.id }),
          ),
          ...toAdd.map((link) =>
            addVendorLinkMutation.mutateAsync({
              contactId: id,
              data: { vendorId: link.vendorId, isPrimary: link.isPrimary },
            }),
          ),
          ...toUpdate.map((link) => {
            const orig = originalLinks.find((o) => o.vendorId === link.vendorId)!;
            return removeVendorLinkMutation
              .mutateAsync({ contactId: id, linkId: orig.id })
              .then(() =>
                addVendorLinkMutation.mutateAsync({
                  contactId: id,
                  data: { vendorId: link.vendorId, isPrimary: link.isPrimary },
                }),
              );
          }),
        ];

        if (linkOps.length > 0) {
          const results = await Promise.allSettled(linkOps);
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length > 0) {
            toast.error(`${failures.length} vendor link operation(s) failed.`);
            return;
          }
        }

        navigate('..', { relative: 'path' });
      } catch {
        // updateMutation.mutateAsync error — toast already shown by mutation onError
      } finally {
        setIsSaving(false);
      }
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => navigate('..', { relative: 'path' }),
      });
    }
  };

  if (isEdit && isLoadingContact) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading contact...</div>
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
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">
                Cancel
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isEdit ? 'Save Changes' : 'Create Contact'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Separator />

      {/* Main layout: sidebar nav + content */}
      <div className="flex gap-8 pt-8">
        {/* Left sidebar nav */}
        <FormSectionNav
          sections={CONTACT_FORM_SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Right content */}
        <div className="flex-1 min-w-0 space-y-6">
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
                        value={field.value ?? ''}
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
                              {role.name}
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
                    const phoneValue = field.value?.phone ?? '';
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
                              const val = e.target.value;
                              field.onChange(
                                val ? { phone: val, label: 'Office' } : undefined,
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
                  Link this contact to one or more vendors.
                </p>
              </div>

              <Separator />

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
                            setVendorLinks((prev) => prev.filter((_, i) => i !== index))
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
                          setVendorLinks((prev) => [
                            ...prev,
                            { vendorId, isPrimary: false },
                          ]);
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
            </CardContent>
          </Card>
        </div>
      </div>

      <QuickCreateVendorDialog
        open={vendorDialogOpen}
        onOpenChange={setVendorDialogOpen}
        onCreated={handleVendorCreated}
      />
    </form>
  );
}
