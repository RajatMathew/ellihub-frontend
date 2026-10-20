import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Separator } from '@/app/components/ui/separator';
import { Plus } from 'lucide-react';

import { LinkedContactRow } from './linked-contact-row';
import { getLinkedContactName } from './linked-contact-utils';

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
  contactSearch: string;
  onContactSearchChange: (value: string) => void;
  isContactLoading: boolean;
  isContactFetchingNextPage: boolean;
  hasMoreContacts: boolean;
  onFetchMoreContacts: () => void;
  targetEntityId?: string;
  targetType: LinkedContactTargetType;
  onChange: (links: LinkedContactItem[]) => void;
  onCreateContact: () => void;
  onContactSelected?: (contact: LinkedContactNameSource) => void;
  /** Opens a linked contact's details for editing. No edit button without it. */
  onEditContact?: (contactId: string) => void;
}

export function LinkedContactsSection({
  title,
  description,
  emptyMessage,
  contactLinks,
  originalLinks,
  contacts,
  contactOptions,
  contactSearch,
  onContactSearchChange,
  isContactLoading,
  isContactFetchingNextPage,
  hasMoreContacts,
  onFetchMoreContacts,
  targetEntityId,
  targetType,
  onChange,
  onCreateContact,
  onContactSelected,
  onEditContact,
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
                <LinkedContactRow
                  key={link.contactId}
                  name={getLinkedContactName(
                    link.contactId,
                    contacts,
                    originalLinks,
                    contactOptions
                  )}
                  isPrimary={link.isPrimary}
                  onPrimaryChange={(checked) =>
                    onChange(
                      contactLinks.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, isPrimary: checked }
                          : { ...item, isPrimary: checked ? false : item.isPrimary }
                      )
                    )
                  }
                  onEdit={onEditContact ? () => onEditContact(link.contactId) : undefined}
                  onRemove={() =>
                    onChange(contactLinks.filter((_, itemIndex) => itemIndex !== index))
                  }
                />
              ))}
            </div>
          )}

          <Field>
            <FieldLabel className="text-xs font-semibold uppercase tracking-normal">
              Add Contact
            </FieldLabel>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <InfiniteSearchSelect
                  options={availableOptions}
                  value={null}
                  onValueChange={(contactId) => {
                    if (!contactId) return;

                    const selectedContact = contacts.find((item) => item.id === contactId);
                    if (selectedContact) {
                      onContactSelected?.(selectedContact);
                    }

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
                  search={contactSearch}
                  onSearchChange={onContactSearchChange}
                  isLoading={isContactLoading}
                  isFetchingNextPage={isContactFetchingNextPage}
                  hasNextPage={hasMoreContacts}
                  onFetchNextPage={onFetchMoreContacts}
                  placeholder="Search contacts..."
                  searchPlaceholder="Search contacts..."
                  emptyMessage={isContactLoading ? 'Loading contacts...' : 'No contacts found.'}
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
