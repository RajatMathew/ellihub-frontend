import { Button } from '@/app/components/ui/button';
import { UserPlus, Users } from 'lucide-react';

interface EmptyTeamStateProps {
  onAddMember: () => void;
}

export function EmptyTeamState({ onAddMember }: EmptyTeamStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-dashed px-4 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-muted">
        <Users className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">No team members yet</h3>
      </div>
      <Button onClick={onAddMember} size="sm">
        <UserPlus className="size-4" />
        Add Your First Member
      </Button>
    </div>
  );
}
