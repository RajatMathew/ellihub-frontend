import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Plus } from 'lucide-react';

interface ContactsPageHeaderProps {
  totalCount: number;
  hasActiveFilters: boolean;
  canCreate: boolean;
}

export function ContactsPageHeader({
  totalCount,
  hasActiveFilters,
  canCreate,
}: ContactsPageHeaderProps) {
  return (
    <ResourcePageHeader
      title="Contacts"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      resultLabel="Contacts"
      addLabel={canCreate ? 'Add Contact' : undefined}
      addTo={canCreate ? 'create' : undefined}
      addIcon={canCreate ? <Plus className="size-4" /> : undefined}
    />
  );
}
