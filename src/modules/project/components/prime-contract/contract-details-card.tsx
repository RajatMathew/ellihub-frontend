import { Badge, BadgeDot } from '@app/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@app/components/ui/card';
import { Separator } from '@app/components/ui/separator';
import { formatCurrency, formatDate } from '@app/lib/helpers';

import { InfoRow } from '@modules/project/components/info-row';
import { PAYMENT_TERMS_LABELS, STAGE_COLOR_MAP } from '@modules/project/constants/project.constants';
import type { PrimeContract } from '@modules/project/schemas/project-contract.schema';
import type { ProjectDetail } from '@modules/project/schemas/project.schema';

interface ContractDetailsCardProps {
  project: ProjectDetail | undefined;
  contract: PrimeContract | undefined;
}

export function ContractDetailsCard({ project, contract }: ContractDetailsCardProps) {
  const stageColor =
    typeof project?.stage?.color === 'string' ? project.stage.color : undefined;
  const stageBadgeVariant = STAGE_COLOR_MAP[stageColor ?? ''] ?? 'secondary';

  return (
    <Card>
      <CardHeader className="bg-foreground text-background rounded-t-xl border-l-4 border-l-warning">
        <CardTitle className="text-xs font-bold tracking-widest uppercase text-background">
          Contract Details
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-1">
        <InfoRow label="Project Name">
          <span className="font-semibold">{project?.name ?? '—'}</span>
          {project?.jobNumber && (
            <span className="text-xs text-muted-foreground ml-1">
              #{project.jobNumber}
            </span>
          )}
        </InfoRow>

        <InfoRow label="Stage">
          {project?.stage ? (
            <Badge variant={stageBadgeVariant as 'success' | 'info' | 'destructive' | 'warning' | 'secondary'} appearance="light" size="sm">
              <BadgeDot />
              {project.stage.name}
            </Badge>
          ) : (
            '—'
          )}
        </InfoRow>

        <InfoRow label="Division">
          {typeof project?.division === 'string'
            ? project.division
            : project?.division?.label || project?.division?.name || '—'}
        </InfoRow>

        <Separator className="my-2" />

        <InfoRow label="Contract Value">
          {contract?.contractValue != null
            ? formatCurrency(contract.contractValue)
            : '—'}
        </InfoRow>

        {contract?.contractType && (
          <InfoRow label="Contract Type">{contract.contractType}</InfoRow>
        )}

        <InfoRow label="Retainage %">
          {contract?.retainagePercent != null
            ? `${contract.retainagePercent}%`
            : '—'}
        </InfoRow>

        <InfoRow label="Target Budget %">
          {contract?.targetBudgetPercent != null
            ? `${contract.targetBudgetPercent}%`
            : '—'}
        </InfoRow>

        <InfoRow label="Payment Terms">
          {contract?.paymentTerms
            ? (PAYMENT_TERMS_LABELS[contract.paymentTerms] ?? contract.paymentTerms)
            : '—'}
        </InfoRow>

        <Separator className="my-2" />

        <InfoRow label="Est. Start Date">
          {contract?.estimatedStartDate
            ? formatDate(contract.estimatedStartDate)
            : '—'}
        </InfoRow>

        <InfoRow label="Est. Completion Date">
          {contract?.estimatedCompletionDate
            ? formatDate(contract.estimatedCompletionDate)
            : '—'}
        </InfoRow>

        <InfoRow label="Actual Start Date">
          {contract?.actualStartDate
            ? formatDate(contract.actualStartDate)
            : '—'}
        </InfoRow>

        <InfoRow label="Actual Completion Date">
          {contract?.actualCompletionDate
            ? formatDate(contract.actualCompletionDate)
            : '—'}
        </InfoRow>

        <Separator className="my-2" />

        <InfoRow label="General Contractor">{project?.gc?.name ?? '—'}</InfoRow>
        <InfoRow label="Project Manager">{project?.leadPM?.name ?? '—'}</InfoRow>
      </CardContent>
    </Card>
  );
}
