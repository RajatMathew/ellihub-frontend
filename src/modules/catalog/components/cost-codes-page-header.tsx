import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Button } from '@/app/components/ui/button';
import { Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CostCodesPageHeaderProps {
  totalCount: number;
  hasActiveFilters: boolean;
  isLoading?: boolean;
  onCreate: () => void;
}

export function CostCodesPageHeader({
  totalCount,
  hasActiveFilters,
  isLoading,
  onCreate,
}: CostCodesPageHeaderProps) {
  return (
    <ResourcePageHeader
      title="Cost Codes"
      totalCount={totalCount}
      hasActiveFilters={hasActiveFilters}
      isLoading={isLoading}
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
