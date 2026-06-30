import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import type { DepartmentStats } from '@/modules/hr/schemas/department.schema';

interface DepartmentListStatsProps {
  stats?: DepartmentStats;
  isLoading?: boolean;
}

export function DepartmentListStats({ stats, isLoading }: DepartmentListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Departments',
          value: stats?.totalDepartments ?? 0,
          description: 'Organization groups',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'Assigned',
          value: stats?.assignedEmployees ?? 0,
          description: 'Employees in departments',
          dotColor: 'bg-success',
        },
        {
          label: 'Unassigned',
          value: stats?.unassignedEmployees ?? 0,
          description: 'Need placement',
          dotColor: 'bg-warning',
        },
        {
          label: 'Empty',
          value: stats?.emptyDepartments ?? 0,
          description: 'No active employees',
          dotColor: 'bg-primary',
        },
      ]}
    />
  );
}
