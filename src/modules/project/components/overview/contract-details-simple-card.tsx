import { Badge, type BadgeProps } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { InfoRow } from '@/modules/project/components/info-row';
import { DIVISION_LABELS } from '@/modules/project/constants/project.constants';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

type StageBadgeVariant = NonNullable<BadgeProps['variant']>;

interface ContractDetailsSimpleCardProps {
  project: ProjectDetail;
}

const getStageBadgeVariant = (stageName: string): StageBadgeVariant => {
  const name = stageName.toUpperCase();

  if (name.includes('CLOSEOUT')) return 'success';
  if (name.includes('PUNCHLIST')) return 'warning';
  if (name.includes('INSTALLATION')) return 'info';
  if (name.includes('SUBMITTALS') || name.includes('BUYOUT') || name.includes('FABRICATION')) {
    return 'primary';
  }

  return 'secondary';
};

export function ContractDetailsSimpleCard({
  project,
}: ContractDetailsSimpleCardProps) {
  const resolveDivisionLabel = (division: ProjectDetail['division']) => {
    if (typeof division === 'string') {
      return DIVISION_LABELS[division as keyof typeof DIVISION_LABELS] ?? division;
    }

    return division?.label || division?.name || 'N/A';
  };

  const stageName = project.stage?.name || project.stage?.label || '';

  return (
    <Card className="flex min-h-80 flex-col">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Contract Details
        </CardTitle>
      </CardHeader>
      <CardContent className="flex grow flex-col p-0">
        <div className="flex flex-col gap-y-4 p-4">
          <div>
            <span className="mb-1 block text-sm font-semibold text-label-light">
              Project Name
            </span>
            <h2 className="text-xl font-bold leading-tight">{project.name}</h2>
          </div>
          <div className="flex flex-col gap-y-3">
            <InfoRow
              label="Job Number"
              className="pb-3 border-b-2 border-separator"
              valueClassName="font-bold"
            >
              {project.jobNumber ?? '-'}
            </InfoRow>
            <InfoRow
              label="Stage"
              className="pb-1 border-b-2 border-separator"
              valueClassName="font-bold flex justify-end"
            >
              {stageName ? (
                <Badge variant={getStageBadgeVariant(stageName)} appearance="light" size="sm">
                  {stageName}
                </Badge>
              ) : (
                '-'
              )}
            </InfoRow>
            <InfoRow
              label="Division"
              className="pb-3 border-b-2 border-separator uppercase"
              valueClassName="font-bold"
            >
              {resolveDivisionLabel(project.division)}
            </InfoRow>
          </div>
        </div>
        <div className="mt-auto border-t border-separator bg-muted/20 px-4 py-5">
          <div className="flex flex-col gap-y-3">
            <InfoRow
              label="General Contractor"
              labelVariant="lighter"
              labelClassName="font-medium"
              valueClassName="font-bold"
            >
              {project.gc?.name ?? '-'}
            </InfoRow>
            <InfoRow
              label="Project Manager"
              labelVariant="lighter"
              labelClassName="font-medium"
              valueClassName="font-bold"
            >
              {project.leadPM?.name ?? '-'}
            </InfoRow>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
