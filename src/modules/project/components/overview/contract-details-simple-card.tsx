import { Badge } from '@app/components/ui/badge';
import { getContrastColor } from '@app/lib/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';

import { InfoRow } from '@modules/project/components/info-row';
import { DIVISION_LABELS } from '@modules/project/constants/project.constants';
import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface ContractDetailsSimpleCardProps {
  project: ProjectDetail;
}

export function ContractDetailsSimpleCard({
  project,
}: ContractDetailsSimpleCardProps) {
  const resolveDivisionLabel = (division: ProjectDetail['division']) => {
    if (typeof division === 'string') {
      return DIVISION_LABELS[division as keyof typeof DIVISION_LABELS] ?? division;
    }

    return division?.label || division?.name || 'N/A';
  };

  return (
    <Card className="min-h-[360px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Contract Details
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col grow p-0">
        <div className="p-4 flex flex-col gap-y-4">
          <div>
            <span className="text-[13px] font-semibold text-label-light block mb-1">
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
              {project.jobNumber ?? '—'}
            </InfoRow>
            <InfoRow
              label="Stage"
              className="pb-1 border-b-2 border-separator"
              valueClassName="font-bold flex justify-end"
            >
              {project.stage ? (
                (() => {
                  const STAGE_COLORS: Record<string, string> = {
                    SUBMITTALS: '#6366f1',
                    BUYOUT: '#8b5cf6',
                    FABRICATION: '#ec4899',
                    INSTALLATION: '#3b82f6',
                    PUNCHLIST: '#f59e0b',
                    CLOSEOUT: '#10b981',
                  };
                  const name = project.stage.name || project.stage.label || '';
                  const nameUpper = name.toUpperCase();
                  let color = typeof project.stage.color === 'string' ? project.stage.color : '#94a3b8';
                  
                  if (!project.stage.color) {
                    for (const [key, c] of Object.entries(STAGE_COLORS)) {
                      if (nameUpper.includes(key)) {
                        color = c;
                        break;
                      }
                    }
                  }

                  return (
                    <Badge
                      style={{
                        backgroundColor: color,
                        color: getContrastColor(color),
                      }}
                      size="sm"
                    >
                      {name}
                    </Badge>
                  );
                })()
              ) : (
                '—'
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
        <div className="mt-auto px-4 py-5 border-t border-separator bg-muted/20">
          <div className="flex flex-col gap-y-3">
            <InfoRow
              label="General Contractor"
              labelVariant="lighter"
              labelClassName="font-medium"
              valueClassName="font-bold"
            >
              {project.gc?.name ?? '—'}
            </InfoRow>
            <InfoRow
              label="Project Manager"
              labelVariant="lighter"
              labelClassName="font-medium"
              valueClassName="font-bold"
            >
              {project.leadPM?.name ?? '—'}
            </InfoRow>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
