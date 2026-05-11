import { StatsCard } from '@/app/components/ui/stats-card';
import { Briefcase, Building2, FolderOpen, Tag } from 'lucide-react';

interface ContactDetailStatsProps {
  roleName: string | null;
  entityCount: number;
  tagCount: number;
}

export function ContactDetailStats({ roleName, entityCount, tagCount }: ContactDetailStatsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      <StatsCard
        icon={<Briefcase className="size-5 text-primary" />}
        bgClass="bg-primary/10"
        label="Role"
        value={roleName ?? '-'}
        description="Professional role"
        compactValue
      />
      <StatsCard
        icon={<Building2 className="size-5 text-success" />}
        bgClass="bg-success/10"
        label="Companies"
        value={entityCount}
        description="Linked entities"
      />
      <StatsCard
        icon={<Tag className="size-5 text-info" />}
        bgClass="bg-info/10"
        label="Tags"
        value={tagCount}
        description="Classifications"
      />
      <StatsCard
        icon={<FolderOpen className="size-5 text-warning" />}
        bgClass="bg-warning/10"
        label="Projects"
        value="-"
        description="Coming soon"
      />
    </div>
  );
}
