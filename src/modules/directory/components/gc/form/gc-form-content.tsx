import { FormSectionNav } from '@/app/components/form-section-nav';
import {
  DeferredSectionCard,
  LinkedContactsSection,
  type LinkedContactItem,
  type LinkedContactNameSource,
  type LinkedContactOriginalLink,
} from '@/modules/directory/components/shared';
import { GC_FORM_SECTIONS } from '@/modules/directory/constants/gc.constants';
import type { GCFormValues } from '@/modules/directory/schemas/gc.schema';
import { FileText } from 'lucide-react';
import type { Control } from 'react-hook-form';

import { GCInfoFormSection } from './gc-info-form-section';

interface GCFormContentProps {
  control: Control<GCFormValues>;
  activeSection: string;
  gcTypeOptions: { value: string; label: string }[];
  contactLinks: LinkedContactItem[];
  originalLinks: LinkedContactOriginalLink[];
  contacts: LinkedContactNameSource[];
  contactOptions: { value: string; label: string }[];
  targetEntityId?: string;
  onSectionChange: (section: string) => void;
  onContactLinksChange: (links: LinkedContactItem[]) => void;
  onCreateContact: () => void;
}

export function GCFormContent({
  control,
  activeSection,
  gcTypeOptions,
  contactLinks,
  originalLinks,
  contacts,
  contactOptions,
  targetEntityId,
  onSectionChange,
  onContactLinksChange,
  onCreateContact,
}: GCFormContentProps) {
  return (
    <>
      <FormSectionNav
        sections={GC_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="space-y-6 pt-6">
        <GCInfoFormSection control={control} gcTypeOptions={gcTypeOptions} />

        <LinkedContactsSection
          title="GC Team Directory"
          description="Define key points of contact within the GC organization."
          emptyMessage="No contacts linked yet. Search above or create a new contact."
          contactLinks={contactLinks}
          originalLinks={originalLinks}
          contacts={contacts}
          contactOptions={contactOptions}
          targetEntityId={targetEntityId}
          targetType="GC"
          onChange={onContactLinksChange}
          onCreateContact={onCreateContact}
        />

        <DeferredSectionCard
          id="compliance-docs"
          title="Master Compliance Documents"
          description="Track enterprise-level agreements and safety records."
          icon={FileText}
          message="Compliance document tracking will be available in a future update."
        />
      </div>
    </>
  );
}
