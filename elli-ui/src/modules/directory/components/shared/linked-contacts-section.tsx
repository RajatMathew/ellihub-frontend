import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import { Switch } from '@/app/components/ui/switch';
import { CircleUserRound, Plus, X } from 'lucide-react';

type LinkedContactTargetType = 'VENDOR' | 'GC';

export interface LinkedContactItem {
  contactId: string;
  isPrimary: boolean;
  replaceExisting?: boolean;
}

export interface LinkedContactNameSource {
  id: string;
  fullName: string;
  vendorId?: string | null;
  vendor?: { id?: string | null; name?: string | null } | null;
  generalContractorId?: string | null;
  generalContractor?: { id?: string | null; name?: string | null } | null;
}

export interface LinkedContactOriginalLink {
  contactId: string;
  contact?: { fullName?: string | null } | null;
}

interface LinkedContactsSectionProps {
  title: string;
  description: string;
  emptyMessage: string;
  contactLinks: LinkedContactItem[];
  originalLinks: LinkedContactOriginalLink[];
  contacts: LinkedContactNameSource[];
  contactOptions: { value: string; label: string }[];
  targetEntityId?: string;
  targetType: LinkedContactTargetType;
  onChange: (links: LinkedContactItem[]) => void;
  onCreateContact: () => void;
}

export function LinkedContactsSection({
  title,
  description,
  emptyMessage,
  contactLinks,
  originalLinks,
  contacts,
  contactOptions,
  targetEntityId,
  targetType,
  onChange,
  onCreateContact,
}: LinkedContactsSectionProps) {
  const [pendingReplacement, setPendingReplacement] = useState<{
    associationLabel: string;
    contactId: string;
  } | null>(null);
  const availableOptions = contactOptions.filter(
    (contact) => !contactLinks.some((link) => link.contactId === contact.value)
  );

  const addContact = (contactId: string, replaceExisting = false) => {
    onChange([
      ...contactLinks,
      {
        contactId,
        isPrimary: contactLinks.length === 0,
        replaceExisting: replaceExisting || undefined,
      },
    ]);
  };

  return (
    <>
      <Card id="contacts">
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <Separator />

          {contactLinks.length > 0 && (
            <div className="space-y-2">
              {contactLinks.map((link, index) => (
                <div
                  key={link.contactId}
                  className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-accent/50 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words text-sm font-medium text-foreground">
                      {getLinkedContactName(
                        link.contactId,
                        originalLinks,
                        contacts,
                        contactOptions
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Primary
                      <Switch
                        checked={link.isPrimary}
                        onCheckedChange={(checked) =>
                          onChange(
                            contactLinks.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, isPrimary: checked }
                                : { ...item, isPrimary: checked ? false : item.isPrimary }
                            )
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
                        onChange(contactLinks.filter((_, itemIndex) => itemIndex !== index))
                      }
                      aria-label="Remove contact"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Field>
            <FieldLabel className="text-xs font-semibold uppercase tracking-normal">
              Add Contact
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <SearchableSelect
                  options={availableOptions}
                  value={null}
                  onValueChange={(contactId) => {
                    if (!contactId) return;

                    const associationLabel = getExistingAssociationLabel(
                      contactId,
                      contacts,
                      targetType,
                      targetEntityId
                    );

                    if (associationLabel) {
                      setPendingReplacement({ associationLabel, contactId });
                      return;
                    }

                    addContact(contactId);
                  }}
                  placeholder="Search contacts..."
                  searchPlaceholder="Search contacts..."
                  emptyMessage="No contacts found."
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={onCreateContact}>
                <Plus className="size-4" />
                Create Contact
              </Button>
            </div>
          </Field>

          {contactLinks.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingReplacement)}
        onOpenChange={(open) => {
          if (!open) setPendingReplacement(null);
        }}
        title="Replace Contact Link?"
        description={
          <>
            This contact is already linked to a {pendingReplacement?.associationLabel}. Do you want
            to replace it?
          </>
        }
        confirmLabel="Replace"
        onConfirm={() => {
          if (!pendingReplacement) return;
          addContact(pendingReplacement.contactId, true);
          setPendingReplacement(null);
        }}
        variant="primary"
      />
    </>
  );
}

function getExistingAssociationLabel(
  contactId: string,
  contacts: LinkedContactNameSource[],
  targetType: LinkedContactTargetType,
  targetEntityId?: string
) {
  const contact = contacts.find((item) => item.id === contactId);
  if (!contact) return null;

  const vendorId = contact.vendorId ?? contact.vendor?.id ?? null;
  const generalContractorId = contact.generalContractorId ?? contact.generalContractor?.id ?? null;

  if (targetType === 'VENDOR' && generalContractorId) {
    return 'GC';
  }

  if (targetType === 'VENDOR' && vendorId && (!targetEntityId || vendorId !== targetEntityId)) {
    return 'vendor';
  }

  if (targetType === 'GC' && vendorId) {
    return 'vendor';
  }

  if (
    targetType === 'GC' &&
    generalContractorId &&
    (!targetEntityId || generalContractorId !== targetEntityId)
  ) {
    return 'GC';
  }

  return null;
}

function getLinkedContactName(
  contactId: string,
  originalLinks: LinkedContactOriginalLink[],
  contacts: LinkedContactNameSource[],
  contactOptions: { value: string; label: string }[]
) {
  const fromLink = originalLinks.find((link) => link.contactId === contactId);
  if (fromLink?.contact?.fullName) {
    return fromLink.contact.fullName;
  }

  return (
    contacts.find((contact) => contact.id === contactId)?.fullName ??
    contactOptions.find((option) => option.value === contactId)?.label ??
    contactId
  );
}
