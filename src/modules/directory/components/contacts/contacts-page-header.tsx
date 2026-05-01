import { Plus } from 'lucide-react';

import { ResourcePageHeader } from '@/app/components/resource-page-header';

interface ContactsPageHeaderProps {
  totalCount: number;
  hasActiveFilters: boolean;
}

export function ContactsPageHeader({ totalCount, hasActiveFilters }: ContactsPageHeaderProps) {
  return (
    <ResourcePageHeader
      title="Contacts"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      resultLabel="Contacts"
      addLabel="Add Contact"
      addTo="create"
      addIcon={<Plus className="size-4" />}
    />
  );
}
