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
  targetEntityId?: string;
  onContactLinksChange: (links: LinkedContactItem[]) => void;
  onCreateContact: () => void;
}

export function VendorFormContent({
  control,
  vendorTypes,
  contactLinks,
  originalLinks,
  contacts,
  contactOptions,
  targetEntityId,
  onContactLinksChange,
  onCreateContact,
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
        targetEntityId={targetEntityId}
        targetType="VENDOR"
        onChange={onContactLinksChange}
        onCreateContact={onCreateContact}
      />
    </div>
  );
}
