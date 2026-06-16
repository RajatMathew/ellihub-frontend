import { ListStatsCards } from '@/app/components/ui/list-stats-cards';
import type { EmployeeStats } from '@/modules/hr/schemas/employee.schema';

interface EmployeeListStatsProps {
  stats?: EmployeeStats;
  isLoading?: boolean;
}

export function EmployeeListStats({ stats, isLoading }: EmployeeListStatsProps) {
  return (
    <ListStatsCards
      isLoading={isLoading}
      skeletonCount={4}
      columns={{ sm: 2, lg: 4 }}
      items={[
        {
          label: 'Total Employees',
          value: stats?.totalEmployees ?? 0,
          description: 'Active workforce',
          dotColor: 'bg-muted-foreground/40',
        },
        {
          label: 'On Leave',
          value: stats?.onLeaveEmployees ?? 0,
          description: 'Current leave status',
          dotColor: 'bg-warning',
        },
        {
          label: 'Linked Users',
          value: stats?.linkedUsers ?? 0,
          description: 'App accounts',
          dotColor: 'bg-success',
        },
        {
          label: 'No Department',
          value: stats?.withoutDepartment ?? 0,
          description: 'Unassigned employees',
          dotColor: 'bg-primary',
        },
      ]}
    />
  );
}
