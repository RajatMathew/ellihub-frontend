import {
  LinkedContactsSection,
  type LinkedContactItem,
  type LinkedContactNameSource,
  type LinkedContactOriginalLink,
} from '@/modules/directory/components/shared';
import type { VendorFormValues, VendorTypeObject } from '@/modules/directory/schemas/vendor.schema';
import type { Control } from 'react-hook-form';

import { VendorInfoFormSection } from './vendor-info-form-section';

interface VendorFormContentProps {
  control: Control<VendorFormValues>;
  vendorTypes: VendorTypeObject[];
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
  onContactLinksChange: (links: LinkedContactItem[]) => void;
  onCreateContact: () => void;
  onContactSelected: (contact: LinkedContactNameSource) => void;
  onEditContact?: (contactId: string) => void;
}

export function VendorFormContent({
  control,
  vendorTypes,
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
  onContactLinksChange,
  onCreateContact,
  onContactSelected,
  onEditContact,
}: VendorFormContentProps) {
  return (
    <div className="space-y-6 pt-4 pb-8 lg:pb-10">
      <VendorInfoFormSection control={control} vendorTypes={vendorTypes} />

      <LinkedContactsSection
        title="Contacts"
        description="Manage multiple points of contact for this vendor."
        emptyMessage="No contacts linked yet. Search above or create a new contact."
        contactLinks={contactLinks}
        originalLinks={originalLinks}
        contacts={contacts}
        contactOptions={contactOptions}
        contactSearch={contactSearch}
        onContactSearchChange={onContactSearchChange}
        isContactLoading={isContactLoading}
        isContactFetchingNextPage={isContactFetchingNextPage}
        hasMoreContacts={hasMoreContacts}
        onFetchMoreContacts={onFetchMoreContacts}
        targetEntityId={targetEntityId}
        targetType="VENDOR"
        onChange={onContactLinksChange}
        onCreateContact={onCreateContact}
        onContactSelected={onContactSelected}
        onEditContact={onEditContact}
      />
    </div>
  );
}
