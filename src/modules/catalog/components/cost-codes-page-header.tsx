import { Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Button } from '@/app/components/ui/button';

interface CostCodesPageHeaderProps {
  totalCount: number;
  hasActiveFilters: boolean;
  onCreate: () => void;
}

export function CostCodesPageHeader({
  totalCount,
  hasActiveFilters,
  onCreate,
}: CostCodesPageHeaderProps) {
  return (
    <ResourcePageHeader
      title="Cost Codes"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      actions={
        <>
          <Button size="sm" variant="outline" asChild>
            <Link to="categories">
              <Edit className="size-4" />
              Categories
            </Link>
          </Button>
        </>
      }
      addLabel="Add Cost Code"
      addIcon={<Plus className="size-4" />}
      onAdd={onCreate}
    />
  );
}
