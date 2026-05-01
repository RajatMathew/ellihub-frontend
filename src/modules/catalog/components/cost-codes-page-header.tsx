import { Edit, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ResourcePageHeader } from '@/app/components/resource-page-header';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';

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
      description={isLoading ? <Skeleton className="h-4 w-28" /> : undefined}
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
