import { useEffect, useState } from 'react';

import { Building2, Check, CircleUserRound, Mail, Phone, Shield, Tag } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import { Separator } from '@app/components/ui/separator';
import { Switch } from '@app/components/ui/switch';
import { cn } from '@app/lib/utils';

import {
  useContactDetailQuery,
  useContactForm,
  useCreateContactMutation,
  useProfessionalRolesQuery,
  useUpdateContactMutation,
} from '../hooks';
import { useGCsQuery } from '../hooks/gc.hooks';
import { useVendorsQuery } from '../hooks/vendors.hooks';
import type { Contact, CreateContactInput } from '../schemas/contact.schema';

/* ---- Sidebar nav items ---- */

const SECTIONS = [
  { id: 'contact-info', label: 'Contact Info' },
  { id: 'association', label: 'Association' },
] as const;

/* ---- Page ---- */

export function ContactFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: contact, isLoading: isLoadingContact } = useContactDetailQuery(id ?? '');
  const { data: roles = [] } = useProfessionalRolesQuery();
  const { data: vendorsData } = useVendorsQuery({ limit: 100 });
  const { data: gcsData } = useGCsQuery({ limit: 100 });
  const createMutation = useCreateContactMutation();
  const updateMutation = useUpdateContactMutation();

  const vendorOptions = (vendorsData?.data ?? []).map((v) => ({
    value: v.id,
    label: v.name,
  }));
  const gcOptions = (gcsData?.data ?? []).map((gc) => ({
    value: gc.id,
    label: gc.name,
  }));

  const { control, handleSubmit, reset, setValue } = useContactForm(
    isEdit && contact
      ? contact
      : {
          name: '',
          jobTitle: '',
          emails: [],
          phoneNumbers: [],
          tags: [],
          vendorId: null,
          generalContractorId: null,
        }
  );

  // Reset form when contact data loads in edit mode
  useEffect(() => {
    if (isEdit && contact) {
      reset(contact);
    }
  }, [isEdit, contact, reset]);

  const [activeSection, setActiveSection] = useState<string>('contact-info');
  const [entityType, setEntityType] = useState<'vendor' | 'gc'>(() =>
    contact?.generalContractorId && !contact?.vendorId ? 'gc' : 'vendor'
  );
  const [isPrimary, setIsPrimary] = useState(false);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData: CreateContactInput | Contact) => {
    if (isEdit && id) {
      const { name, jobTitle, emails, phoneNumbers, tags, vendorId, generalContractorId } =
        formData;
      updateMutation.mutate(
        { id, data: { name, jobTitle, emails, phoneNumbers, tags, vendorId, generalContractorId } },
        { onSuccess: () => navigate('..', { relative: 'path' }) }
      );
    } else {
      createMutation.mutate(formData as CreateContactInput, {
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
                : 'Register a new individual and associate them with a vendor or general contractor.'}
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
        <nav className="hidden w-44 shrink-0 lg:block">
          <ul className="space-y-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(section.id);
                    document
                      .getElementById(section.id)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={cn(
                    'w-full text-left text-sm px-4 py-2 rounded-md border-l-2 transition-colors',
                    activeSection === section.id
                      ? 'border-primary text-primary font-semibold bg-transparent'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

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
                  name="name"
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
                  name="jobTitle"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Professional Role
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <div className="flex items-center gap-2">
                            <Building2 className="size-4 text-muted-foreground" />
                            <SelectValue placeholder="Select role..." />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {roles.length > 0 ? (
                            roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="Project Manager">Project Manager</SelectItem>
                              <SelectItem value="Superintendent">Superintendent</SelectItem>
                              <SelectItem value="Estimator">Estimator</SelectItem>
                              <SelectItem value="Engineer">Engineer</SelectItem>
                              <SelectItem value="Architect">Architect</SelectItem>
                              <SelectItem value="Accounting">Accounting</SelectItem>
                              <SelectItem value="Safety Officer">Safety Officer</SelectItem>
                              <SelectItem value="Foreman">Foreman</SelectItem>
                              <SelectItem value="Contracts Manager">Contracts Manager</SelectItem>
                            </>
                          )}
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
                  name="emails"
                  control={control}
                  render={({ field, fieldState }) => {
                    const firstEmail = field.value?.[0]?.email ?? '';
                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Email Address
                        </FieldLabel>
                        <InputWrapper>
                          <Mail className="size-4" />
                          <Input
                            type="email"
                            value={firstEmail}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val ? [{ email: val, label: 'Work' }] : []);
                            }}
                            placeholder="m.chen@company.com"
                            aria-invalid={fieldState.invalid}
                            autoComplete="off"
                          />
                        </InputWrapper>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    );
                  }}
                />

                <Controller
                  name="phoneNumbers"
                  control={control}
                  render={({ field, fieldState }) => {
                    const firstPhone = field.value?.[0]?.phone ?? '';
                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Direct Phone
                        </FieldLabel>
                        <InputWrapper>
                          <Phone className="size-4" />
                          <Input
                            type="tel"
                            value={firstPhone}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val ? [{ phone: val, label: 'Office' }] : []);
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
                render={({ field }) => {
                  const tagsStr = (field.value ?? []).join(', ');
                  return (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Tags
                      </FieldLabel>
                      <InputWrapper>
                        <Tag className="size-4" />
                        <Input
                          value={tagsStr}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(
                              val
                                ? val
                                    .split(',')
                                    .map((t) => t.trim())
                                    .filter(Boolean)
                                : []
                            );
                          }}
                          placeholder="e.g. Decision Maker, Finance, Urgent Only (comma separated)"
                          autoComplete="off"
                        />
                      </InputWrapper>
                      <p className="text-xs text-muted-foreground">
                        Use commas to separate multiple tags.
                      </p>
                    </Field>
                  );
                }}
              />

              <Separator />

              {/* Primary Focal Point */}
              <div className="flex items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900">
                  <Shield className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold tracking-wide text-foreground uppercase">
                    Primary Focal Point
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Mark this contact as the lead representative for the organization.
                  </div>
                </div>
                <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
              </div>
            </CardContent>
          </Card>

          {/* ---- Section: External Association ---- */}
          <Card id="association">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">External Association</h2>
                <p className="text-sm text-muted-foreground">
                  Link this contact to a vendor or general contractor.
                </p>
              </div>

              <Separator />

              {/* Entity Type Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Entity Type
                </span>
                <div className="flex rounded-md border border-border">
                  <button
                    type="button"
                    className={cn(
                      'px-4 py-1.5 text-sm font-semibold transition-colors rounded-l-md',
                      entityType === 'vendor'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => {
                      setEntityType('vendor');
                      setValue('generalContractorId', null);
                    }}
                  >
                    Vendor
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'px-4 py-1.5 text-sm font-semibold transition-colors rounded-r-md border-l border-border',
                      entityType === 'gc'
                        ? 'bg-foreground text-background'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => {
                      setEntityType('gc');
                      setValue('vendorId', null);
                    }}
                  >
                    Gen. Contractor
                  </button>
                </div>
              </div>

              {/* Conditional Link Field */}
              {entityType === 'vendor' ? (
                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Link to Vendor
                      </FieldLabel>
                      <SearchableSelect
                        options={vendorOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search Vendors..."
                        searchPlaceholder="Search vendors..."
                        emptyMessage="No vendors found."
                      />
                    </Field>
                  )}
                />
              ) : (
                <Controller
                  name="generalContractorId"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Link to General Contractor
                      </FieldLabel>
                      <SearchableSelect
                        options={gcOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search Contractors..."
                        searchPlaceholder="Search contractors..."
                        emptyMessage="No contractors found."
                      />
                    </Field>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
