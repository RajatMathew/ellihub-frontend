import { Button } from '@/app/components/ui/button';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { UserPlus, X } from 'lucide-react';

interface EmployeeOption {
  value: string;
  label: string;
}

interface AddTeamMemberFormProps {
  employeeOptions: EmployeeOption[];
  onAdd: (employeeId: string) => Promise<void>;
  onCancel: () => void;
}

export function AddTeamMemberForm({ employeeOptions, onAdd, onCancel }: AddTeamMemberFormProps) {
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
      <SearchableSelect
        options={employeeOptions}
        value={null}
        onValueChange={handleAdd}
        placeholder="Select employee..."
        searchPlaceholder="Search employees..."
        emptyMessage="No employees found."
      />
    </div>
  );
}
