import { Badge, type BadgeProps } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { InfoRow } from '@/modules/project/components/shared';
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

const formatProjectDate = (date?: string | null) => date?.split('T')[0] ?? '-';
const truncateName = (name: string) => (name.length > 18 ? `${name.slice(0, 18)}...` : name);

function TruncatedName({ name }: { name?: string | null }) {
  if (!name) return '-';

  const displayName = truncateName(name);
  if (displayName === name) return name;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block max-w-full cursor-pointer truncate" tabIndex={0}>
          {displayName}
        </span>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}

export function ContractDetailsSimpleCard({ project }: ContractDetailsSimpleCardProps) {
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
      <CardContent className="flex grow flex-col p-0 sm:p-0">
        <div className="flex flex-col gap-y-4 px-5 py-5">
          <div>
            <span className="mb-1 block text-sm font-semibold text-blue-600">
              {project.jobNumber ?? '-'}
            </span>
            <h2 className="text-lg font-bold leading-snug">{project.name}</h2>
          </div>
          <div className="flex w-full flex-col gap-y-3.5">
            <InfoRow
              label="TCO Date"
              className="items-center pb-3.5 border-b-2 border-separator"
              labelVariant="light"
              labelClassName="font-semibold"
              valueClassName="font-bold tabular-nums"
            >
              {formatProjectDate(project.tcoDate)}
            </InfoRow>
            <InfoRow
              label="Stage"
              className="items-center pb-3.5 border-b-2 border-separator"
              labelVariant="light"
              labelClassName="font-semibold"
              valueClassName="font-bold flex justify-end"
            >
              {stageName ? (
                <Badge
                  variant={getStageBadgeVariant(stageName)}
                  appearance="light"
                  size="sm"
                  className="px-2.5 py-1 font-semibold"
                >
                  {stageName}
                </Badge>
              ) : (
                '-'
              )}
            </InfoRow>
            <InfoRow
              label="Division"
              className="items-center pb-3.5 border-b-2 border-separator"
              labelVariant="light"
              labelClassName="font-semibold"
              valueClassName="font-bold uppercase"
            >
              {resolveDivisionLabel(project.division)}
            </InfoRow>
          </div>
        </div>
        <div className="mt-auto flex min-h-24 items-center border-t border-separator bg-muted/40 px-5 py-5">
          <div className="flex w-full flex-col gap-y-3.5">
            <InfoRow
              label="General Contractor"
              labelVariant="lighter"
              labelClassName="font-medium"
              valueClassName="max-w-[58%] font-bold"
            >
              <TruncatedName name={project.gc?.name} />
            </InfoRow>
            <InfoRow
              label="Lead PM"
              labelVariant="lighter"
              labelClassName="font-medium"
              valueClassName="max-w-[58%] font-bold"
            >
              <TruncatedName name={project.leadPM?.name} />
            </InfoRow>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
