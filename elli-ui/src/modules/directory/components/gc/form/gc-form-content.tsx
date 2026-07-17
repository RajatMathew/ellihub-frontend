import {
  DeferredSectionCard,
  LinkedContactsSection,
  type LinkedContactItem,
  type LinkedContactNameSource,
  type LinkedContactOriginalLink,
} from '@/modules/directory/components/shared';
import type { GCFormValues } from '@/modules/directory/schemas/gc.schema';
import { FileText } from 'lucide-react';
import type { Control } from 'react-hook-form';

import { GCInfoFormSection } from './gc-info-form-section';

interface GCFormContentProps {
  control: Control<GCFormValues>;
  gcTypeOptions: { value: string; label: string }[];
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
}

export function GCFormContent({
  control,
  gcTypeOptions,
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
}: GCFormContentProps) {
  return (
    <div className="space-y-6 pt-4 pb-8 lg:pb-10">
      <GCInfoFormSection control={control} gcTypeOptions={gcTypeOptions} />

      <LinkedContactsSection
        title="GC Team Directory"
        description="Define key points of contact within the GC organization."
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
        targetType="GC"
        onChange={onContactLinksChange}
        onCreateContact={onCreateContact}
        onContactSelected={onContactSelected}
      />

      <DeferredSectionCard
        id="compliance-docs"
        title="Master Compliance Documents"
        description="Track enterprise-level agreements and safety records."
        icon={FileText}
        message="Compliance document tracking will be available in a future update."
      />
    </div>
  );
}
