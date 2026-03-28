import { UserPlus, X } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { SearchableSelect } from '@app/components/ui/searchable-select';

interface EmployeeOption {
  value: string;
  label: string;
}

interface AddTeamMemberFormProps {
  employeeOptions: EmployeeOption[];
  onAdd: (employeeId: string) => Promise<void>;
  onCancel: () => void;
}

export function AddTeamMemberForm({
  employeeOptions,
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
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 shrink-0">
          <UserPlus className="size-4 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium">Add Team Member</h4>
          <p className="text-xs text-muted-foreground">
            Select an employee to add to this project
          </p>
        </div>
        <Button variant="ghost" mode="icon" size="sm" onClick={onCancel}>
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
