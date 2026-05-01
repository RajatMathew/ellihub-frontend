import { FormSectionNav } from '@/app/components/form-section-nav';
import {
  DeferredSectionCard,
  LinkedContactsSection,
  type LinkedContactItem,
  type LinkedContactNameSource,
  type LinkedContactOriginalLink,
} from '@/modules/directory/components/shared';
import { VENDOR_FORM_SECTIONS } from '@/modules/directory/constants/vendors.constants';
import type { VendorFormValues, VendorTypeObject } from '@/modules/directory/schemas/vendor.schema';
import { FileText } from 'lucide-react';
import type { Control } from 'react-hook-form';

import { VendorInfoFormSection } from './vendor-info-form-section';

interface VendorFormContentProps {
  control: Control<VendorFormValues>;
  activeSection: string;
  vendorTypes: VendorTypeObject[];
  contactLinks: LinkedContactItem[];
  originalLinks: LinkedContactOriginalLink[];
  contacts: LinkedContactNameSource[];
  contactOptions: { value: string; label: string }[];
  onSectionChange: (section: string) => void;
  onContactLinksChange: (links: LinkedContactItem[]) => void;
  onCreateContact: () => void;
}

export function VendorFormContent({
  control,
  activeSection,
  vendorTypes,
  contactLinks,
  originalLinks,
  contacts,
  contactOptions,
  onSectionChange,
  onContactLinksChange,
  onCreateContact,
}: VendorFormContentProps) {
  return (
    <>
      <FormSectionNav
        sections={VENDOR_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="space-y-6 pt-6">
        <VendorInfoFormSection control={control} vendorTypes={vendorTypes} />

        <LinkedContactsSection
          title="Contacts"
          description="Manage multiple points of contact for this vendor."
          emptyMessage="No contacts linked yet. Search above or create a new contact."
          contactLinks={contactLinks}
          originalLinks={originalLinks}
          contacts={contacts}
          contactOptions={contactOptions}
          onChange={onContactLinksChange}
          onCreateContact={onCreateContact}
        />

        <DeferredSectionCard
          id="compliance-docs"
          title="Compliance Docs"
          description="Track insurance and legal documentation status."
          icon={FileText}
          message="Compliance document tracking will be available in a future update."
        />
      </div>
    </>
  );
}
