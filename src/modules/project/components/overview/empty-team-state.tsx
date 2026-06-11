import { UserPlus, Users } from 'lucide-react';

import { Button } from '@/app/components/ui/button';

interface EmptyTeamStateProps {
  onAddMember: () => void;
}

export function EmptyTeamState({ onAddMember }: EmptyTeamStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center border border-dashed rounded-lg">
      <div className="flex items-center justify-center size-16 rounded-full bg-muted">
        <Users className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-base font-semibold">No team members yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start building your project team by adding members. Assign roles and designate a Lead PM to manage the project.
        </p>
      </div>
      <Button onClick={onAddMember} size="sm">
        <UserPlus className="size-4" />
        Add Your First Member
      </Button>
    </div>
  );
}
