import { Button } from '@/app/components/ui/button';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { UserPlus, X } from 'lucide-react';

interface EmployeeOption {
  value: string;
  label: string;
}

interface AddTeamMemberFormProps {
  employeeOptions: EmployeeOption[];
  employeeSearch: string;
  onEmployeeSearchChange: (value: string) => void;
  isLoadingEmployees: boolean;
  isEmployeeFetchingNextPage: boolean;
  hasMoreEmployees: boolean;
  onFetchMoreEmployees: () => void;
  onAdd: (employeeId: string) => Promise<void>;
  onCancel: () => void;
}

export function AddTeamMemberForm({
  employeeOptions,
  employeeSearch,
  onEmployeeSearchChange,
  isLoadingEmployees,
  isEmployeeFetchingNextPage,
  hasMoreEmployees,
  onFetchMoreEmployees,
  onAdd,
  onCancel,
}: AddTeamMemberFormProps) {
  const handleAdd = async (employeeId: string | null) => {
    if (employeeId) {
      await onAdd(employeeId);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <UserPlus className="size-4 text-primary" />
          </div>
          <h4 className="truncate text-sm font-semibold">Add Team Member</h4>
        </div>
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          onClick={onCancel}
          aria-label="Cancel adding team member"
          className="shrink-0"
        >
          <X className="size-4" />
        </Button>
      </div>
      <InfiniteSearchSelect
        options={employeeOptions}
        value={null}
        onValueChange={handleAdd}
        search={employeeSearch}
        onSearchChange={onEmployeeSearchChange}
        isLoading={isLoadingEmployees}
        isFetchingNextPage={isEmployeeFetchingNextPage}
        hasNextPage={hasMoreEmployees}
        onFetchNextPage={onFetchMoreEmployees}
        placeholder="Select employee..."
        searchPlaceholder="Search employees..."
        emptyMessage={isLoadingEmployees ? 'Loading employees...' : 'No employees found.'}
      />
    </div>
  );
}
