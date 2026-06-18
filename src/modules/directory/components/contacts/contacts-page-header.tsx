import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Plus } from 'lucide-react';

interface ContactsPageHeaderProps {
  isLoading?: boolean;
  totalCount: number;
  hasActiveFilters: boolean;
  canCreate: boolean;
}

export function ContactsPageHeader({
  isLoading,
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
      isLoading={isLoading}
      addLabel={canCreate ? 'Add Contact' : undefined}
      addTo={canCreate ? 'create' : undefined}
      addIcon={canCreate ? <Plus className="size-4" /> : undefined}
    />
  );
}
