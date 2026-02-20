import { useRef, useMemo, useState } from 'react';

import {
  Briefcase,
  Building2,
  ExternalLink,
  FolderOpen,
  Mail,
  MoreHorizontal,
  PanelRightOpen,
  Pencil,
  Phone,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { ConfirmDialog } from '@app/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { Separator } from '@app/components/ui/separator';
import { StatsCard } from '@app/components/ui/stats-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@app/components/ui/tabs';

import { ComingSoonPlaceholder, ContactInfoItem, DetailSidebar, InlineAddForm } from '../components';
import {
  useAddEmailMutation,
  useAddPhoneMutation,
  useContactDetailQuery,
  useDeleteContactMutation,
  useRemoveEmailMutation,
  useRemovePhoneMutation,
  useUpdateContactMutation,
  useVendorsQuery,
} from '../hooks';
import { contactEmailSchema, contactPhoneInputSchema } from '../schemas/contact.schema';

/* ---- Constants ---- */

const PHONE_LABEL_OPTIONS = [
  { value: 'Primary', label: 'Primary' },
  { value: 'Mobile', label: 'Mobile' },
  { value: 'Work', label: 'Work' },
  { value: 'Home', label: 'Home' },
  { value: 'Fax', label: 'Fax' },
];

const EMAIL_LABEL_OPTIONS = [
  { value: 'Work', label: 'Work' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Other', label: 'Other' },
];

/* ---- Page ---- */

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: apiContact, isLoading } = useContactDetailQuery(id ?? '');
  const deleteMutation = useDeleteContactMutation();
  const updateMutation = useUpdateContactMutation();
  const addPhoneMutation = useAddPhoneMutation();
  const removePhoneMutation = useRemovePhoneMutation();
  const addEmailMutation = useAddEmailMutation();
  const removeEmailMutation = useRemoveEmailMutation();

  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });
  const vendorNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vendorsData?.data ?? []) map.set(v.id, v.name);
    return map;
  }, [vendorsData]);

  const roleName = apiContact?.professionalRole?.name ?? null;
  const resolvedVendorLinks = (apiContact?.vendorLinks ?? []).map((link) => ({
    ...link,
    name: vendorNames.get(link.vendorId) ?? link.vendorId,
  }));
  const primaryVendorName =
    resolvedVendorLinks.find((l) => l.isPrimary)?.name ?? resolvedVendorLinks[0]?.name ?? null;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ---- Add phone inline form ---- */
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneLabel, setNewPhoneLabel] = useState('Primary');
  const [addPhoneConfirmOpen, setAddPhoneConfirmOpen] = useState(false);
  const [addPhoneError, setAddPhoneError] = useState('');

  const validateAndSubmitPhone = () => {
    const result = contactPhoneInputSchema.safeParse({ phone: newPhone.trim(), label: newPhoneLabel });
    if (!result.success) {
      setAddPhoneError(result.error.issues[0]?.message ?? 'Enter a valid phone number.');
      return;
    }
    setAddPhoneError('');
    setAddPhoneConfirmOpen(true);
  };

  const handleAddPhone = () => {
    if (!id || !newPhone.trim()) return;
    addPhoneMutation.mutate(
      { id, phone: { phone: newPhone.trim(), label: newPhoneLabel } },
      {
        onSuccess: () => {
          setNewPhone('');
          setNewPhoneLabel('Primary');
          setShowAddPhone(false);
          setAddPhoneConfirmOpen(false);
          toast.success('Phone number added.');
        },
      },
    );
  };

  /* ---- Add email inline form ---- */
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailLabel, setNewEmailLabel] = useState('Work');
  const [addEmailConfirmOpen, setAddEmailConfirmOpen] = useState(false);
  const [addEmailError, setAddEmailError] = useState('');

  const validateAndSubmitEmail = () => {
    const result = contactEmailSchema.safeParse({ email: newEmail.trim(), label: newEmailLabel });
    if (!result.success) {
      setAddEmailError('Enter a valid email address.');
      return;
    }
    setAddEmailError('');
    setAddEmailConfirmOpen(true);
  };

  const handleAddEmail = () => {
    if (!id || !newEmail.trim()) return;
    addEmailMutation.mutate(
      { id, email: { email: newEmail.trim(), label: newEmailLabel } },
      {
        onSuccess: () => {
          setNewEmail('');
          setNewEmailLabel('Work');
          setShowAddEmail(false);
          setAddEmailConfirmOpen(false);
          toast.success('Email address added.');
        },
      },
    );
  };

  /* ---- Remove phone / email ---- */
  const [removePhoneConfirm, setRemovePhoneConfirm] = useState(false);
  const [removeEmailConfirm, setRemoveEmailConfirm] = useState(false);

  const handleRemovePhone = () => {
    if (!id) return;
    removePhoneMutation.mutate(id, {
      onSuccess: () => {
        setRemovePhoneConfirm(false);
        toast.success('Phone number removed.');
      },
    });
  };

  const handleRemoveEmail = () => {
    if (!id) return;
    removeEmailMutation.mutate(id, {
      onSuccess: () => {
        setRemoveEmailConfirm(false);
        toast.success('Email address removed.');
      },
    });
  };

  /* ---- Tags ---- */
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = () => {
    if (!id || !apiContact) return;
    const trimmed = newTagValue.trim();
    if (!trimmed || apiContact.tags.includes(trimmed)) {
      setNewTagValue('');
      return;
    }
    updateMutation.mutate(
      { id, data: { tags: [...apiContact.tags, trimmed] } },
      {
        onSuccess: () => {
          setNewTagValue('');
          toast.success('Tag added.');
        },
        onError: () => toast.error('Failed to add tag.'),
      },
    );
  };

  const handleRemoveTag = (tag: string) => {
    if (!id || !apiContact) return;
    updateMutation.mutate(
      { id, data: { tags: apiContact.tags.filter((t) => t !== tag) } },
      {
        onSuccess: () => toast.success('Tag removed.'),
        onError: () => toast.error('Failed to remove tag.'),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading contact...</div>
      </div>
    );
  }

  if (!apiContact) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Contact not found.</div>
      </div>
    );
  }

  const contact = apiContact;

  return (
    <div className="container-fluid py-7.5">
      {/* ---- Toolbar ---- */}
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
            <ToolbarPageTitle>{contact.fullName}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {roleName}
              {primaryVendorName && ` at ${primaryVendorName}`}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" asChild>
              <Link to="edit">
                <Pencil className="size-4" />
                Edit Contact
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" mode="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete Permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {!sidebarOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelRightOpen className="size-4" />
                View Details
              </Button>
            )}
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* ---- Main layout ---- */}
      <div className="flex gap-6 pt-5">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Stats — from real API data */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              icon={<Briefcase className="size-5 text-primary" />}
              bgClass="bg-primary/10"
              label="Role"
              value={roleName ?? '—'}
              description="Professional role"
            />
            <StatsCard
              icon={<Building2 className="size-5 text-success" />}
              bgClass="bg-success/10"
              label="Companies"
              value={resolvedVendorLinks.length}
              description="Linked entities"
            />
            <StatsCard
              icon={<Tag className="size-5 text-info" />}
              bgClass="bg-info/10"
              label="Tags"
              value={contact.tags.length}
              description="Classifications"
            />
            <StatsCard
              icon={<FolderOpen className="size-5 text-warning" />}
              bgClass="bg-warning/10"
              label="Projects"
              value="—"
              description="Coming soon"
            />
          </div>

          {/* Main tabs */}
          <Tabs defaultValue="overview">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
            </TabsList>

            {/* ---- Overview tab ---- */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Personal Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Personal Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Professional Role */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-accent">
                        <Briefcase className="size-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Professional Role
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {roleName ?? '—'}
                        </div>
                      </div>
                    </div>

                    {/* Company */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-accent">
                        <Building2 className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Company
                        </div>
                        <div className="text-sm font-medium text-foreground">
                          {resolvedVendorLinks.length > 0
                            ? resolvedVendorLinks.map((l) => l.name).join(', ')
                            : '—'}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Tags */}
                    <div>
                      <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                        Classification & Tags
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            appearance="outline"
                            size="sm"
                            className="gap-1 pr-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 gap-1 text-xs"
                          onClick={() => {
                            setShowAddTag(!showAddTag);
                            if (!showAddTag) {
                              setTimeout(() => tagInputRef.current?.focus(), 0);
                            }
                          }}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      {showAddTag && (
                        <div className="mt-2">
                          <input
                            ref={tagInputRef}
                            type="text"
                            value={newTagValue}
                            onChange={(e) => setNewTagValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddTag();
                              } else if (e.key === 'Escape') {
                                setShowAddTag(false);
                                setNewTagValue('');
                              }
                            }}
                            onBlur={() => {
                              if (newTagValue.trim()) handleAddTag();
                              else {
                                setShowAddTag(false);
                                setNewTagValue('');
                              }
                            }}
                            placeholder="Type a tag and press Enter..."
                            className="flex h-7 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-xs shadow-black/5 transition-[color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Contact Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Phone Number */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Phone Number
                        </span>
                        {!contact.phoneNumber && (
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:text-primary/80"
                            onClick={() => setShowAddPhone(!showAddPhone)}
                          >
                            {showAddPhone ? 'Cancel' : '+ Add Number'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {contact.phoneNumber ? (
                          <ContactInfoItem
                            icon={Phone}
                            value={contact.phoneNumber.phone}
                            label={contact.phoneNumber.label}
                            onRemove={() => setRemovePhoneConfirm(true)}
                          />
                        ) : (
                          !showAddPhone && (
                            <span className="text-sm text-muted-foreground">No phone number</span>
                          )
                        )}
                        {showAddPhone && !contact.phoneNumber && (
                          <InlineAddForm
                            placeholder="(555) 000-0000"
                            value={newPhone}
                            onValueChange={(v) => {
                              setNewPhone(v);
                              if (addPhoneError) setAddPhoneError('');
                            }}
                            labelValue={newPhoneLabel}
                            onLabelChange={setNewPhoneLabel}
                            labelOptions={PHONE_LABEL_OPTIONS}
                            onSubmit={validateAndSubmitPhone}
                            isPending={addPhoneMutation.isPending}
                            error={addPhoneError}
                          />
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Email Address */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          Email Address
                        </span>
                        {!contact.email && (
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:text-primary/80"
                            onClick={() => setShowAddEmail(!showAddEmail)}
                          >
                            {showAddEmail ? 'Cancel' : '+ Add Email'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        {contact.email ? (
                          <ContactInfoItem
                            icon={Mail}
                            value={contact.email.email}
                            label={contact.email.label}
                            onRemove={() => setRemoveEmailConfirm(true)}
                          />
                        ) : (
                          !showAddEmail && (
                            <span className="text-sm text-muted-foreground">No email address</span>
                          )
                        )}
                        {showAddEmail && !contact.email && (
                          <InlineAddForm
                            placeholder="email@example.com"
                            inputType="email"
                            value={newEmail}
                            onValueChange={(v) => {
                              setNewEmail(v);
                              if (addEmailError) setAddEmailError('');
                            }}
                            labelValue={newEmailLabel}
                            onLabelChange={setNewEmailLabel}
                            labelOptions={EMAIL_LABEL_OPTIONS}
                            onSubmit={validateAndSubmitEmail}
                            isPending={addEmailMutation.isPending}
                            error={addEmailError}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ---- Projects tab (no API endpoint yet) ---- */}
            <TabsContent value="projects">
              <Card>
                <CardContent>
                  <ComingSoonPlaceholder icon={FolderOpen} title="Project Assignments" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ---- Right sidebar ---- */}
        <DetailSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <div className="space-y-4 pt-2">
            <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Entity Association
            </div>
            {resolvedVendorLinks.length > 0 ? (
              <div className="space-y-3">
                {resolvedVendorLinks.map((link) => (
                  <Card key={link.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-bold text-foreground uppercase">
                            {link.name}
                          </div>
                          {link.isPrimary && (
                            <Badge variant="secondary" appearance="light" size="sm" className="mt-1">
                              Primary
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" mode="icon" className="size-6">
                          <ExternalLink className="size-3.5" />
                        </Button>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground uppercase">
                          {roleName ?? '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-4">No entity linked</div>
            )}
          </div>
        </DetailSidebar>
      </div>

      {/* ---- Confirmation dialogs ---- */}
      <ConfirmDialog
        open={addPhoneConfirmOpen}
        onOpenChange={setAddPhoneConfirmOpen}
        title="Add Phone Number"
        description={<>Add <strong>{newPhone}</strong> ({newPhoneLabel}) to {contact.fullName}?</>}
        confirmLabel="Add Number"
        onConfirm={handleAddPhone}
        isPending={addPhoneMutation.isPending}
      />
      <ConfirmDialog
        open={removePhoneConfirm}
        onOpenChange={setRemovePhoneConfirm}
        title="Remove Phone Number"
        description={
          <>
            Remove{' '}
            <strong>{contact.phoneNumber?.phone ?? ''}</strong>{' '}
            from {contact.fullName}?
          </>
        }
        confirmLabel="Remove"
        onConfirm={handleRemovePhone}
        variant="destructive"
        isPending={removePhoneMutation.isPending}
      />
      <ConfirmDialog
        open={addEmailConfirmOpen}
        onOpenChange={setAddEmailConfirmOpen}
        title="Add Email Address"
        description={<>Add <strong>{newEmail}</strong> ({newEmailLabel}) to {contact.fullName}?</>}
        confirmLabel="Add Email"
        onConfirm={handleAddEmail}
        isPending={addEmailMutation.isPending}
      />
      <ConfirmDialog
        open={removeEmailConfirm}
        onOpenChange={setRemoveEmailConfirm}
        title="Remove Email Address"
        description={
          <>
            Remove{' '}
            <strong>{contact.email?.email ?? ''}</strong>{' '}
            from {contact.fullName}?
          </>
        }
        confirmLabel="Remove"
        onConfirm={handleRemoveEmail}
        variant="destructive"
        isPending={removeEmailMutation.isPending}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Contact Permanently"
        description={
          <>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{contact.fullName}</strong> and remove all associated data.
          </>
        }
        confirmLabel="Delete Permanently"
        onConfirm={() => {
          if (id) {
            deleteMutation.mutate(id, {
              onSuccess: () => navigate('..', { relative: 'path' }),
            });
          }
        }}
        variant="destructive"
      />
    </div>
  );
}
