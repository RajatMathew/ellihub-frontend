import type { ReactNode } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { PTOStatusBadge } from '@/modules/hr/components/pto/shared';
import type { PTODecisionTarget } from '@/modules/hr/components/pto/shared';
import {
  calculatePTODays,
  formatPTODate,
  formatPTOReference,
  getPTOEmployeeName,
  getPTOTypeLabel,
} from '@/modules/hr/components/pto/shared/pto-utils';
import type { PTO } from '@/modules/hr/schemas/pto.schema';
import { Check, Edit2, Eye, MoreHorizontal, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PTOCellProps {
  pto: PTO;
}

interface PTOActionsCellProps extends PTOCellProps {
  isDecisionPending: boolean;
  onDelete: (request: { id: string; name: string }) => void;
  onDecision: (target: PTODecisionTarget) => void;
}

export function PTOReferenceCell({ pto }: PTOCellProps) {
  return (
    <Link to={pto.id} className="text-xs font-bold text-primary hover:underline">
      {formatPTOReference(pto.id)}
    </Link>
  );
}

export function PTOEmployeeCell({ pto }: PTOCellProps) {
  return <span className="text-xs font-bold tracking-normal">{getPTOEmployeeName(pto)}</span>;
}

export function PTOTypeCell({ pto }: PTOCellProps) {
  return (
    <Badge
      variant="outline"
      className="whitespace-nowrap border-primary/20 bg-primary/5 text-xs font-bold text-primary"
    >
      {getPTOTypeLabel(pto)}
    </Badge>
  );
}

export function PTODatesCell({ pto }: PTOCellProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
        {formatPTODate(pto.startDate)}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-muted-foreground/60">To</span>
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
          {formatPTODate(pto.endDate)}
        </span>
      </div>
    </div>
  );
}

export function PTODaysCell({ pto }: PTOCellProps) {
  return (
    <span className="whitespace-nowrap text-xs font-bold">
      {calculatePTODays(pto.startDate, pto.endDate)}d
    </span>
  );
}

export function PTOUpdatedCell({ pto }: PTOCellProps) {
  return (
    <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
      {formatPTODate(pto.updatedAt)}
    </span>
  );
}

export function PTOActionsCell({
  pto,
  isDecisionPending,
  onDelete,
  onDecision,
}: PTOActionsCellProps) {
  const employeeName = getPTOEmployeeName(pto);

  return (
    <div className="flex items-center justify-end gap-2 px-2">
      {pto.status === 'PENDING' && (
        <>
          <DecisionIconButton
            label="Approve Request"
            icon={<Check className="size-4" />}
            className="text-success hover:bg-success/10 hover:text-success"
            disabled={isDecisionPending}
            onClick={() => onDecision({ id: pto.id, name: employeeName, type: 'approve' })}
          />
          <DecisionIconButton
            label="Reject Request"
            icon={<X className="size-4" />}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={isDecisionPending}
            onClick={() => onDecision({ id: pto.id, name: employeeName, type: 'reject' })}
          />
        </>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="xs" mode="icon" className="size-8 hover:bg-muted">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">PTO actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link to={pto.id}>
              <Eye className="size-4" />
              View Details
            </Link>
          </DropdownMenuItem>
          {pto.status === 'PENDING' && (
            <DropdownMenuItem asChild>
              <Link to={`${pto.id}/edit`}>
                <Edit2 className="size-4" />
                Edit Request
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete({ id: pto.id, name: employeeName })}
          >
            <Trash2 className="size-4" />
            Delete Request
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function PTOStatusCell({ pto }: PTOCellProps) {
  return <PTOStatusBadge status={pto.status} />;
}

export function PTODatesSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-3.5 w-24 rounded" />
      <Skeleton className="h-3 w-20 rounded" />
    </div>
  );
}

function DecisionIconButton({
  label,
  icon,
  className,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="xs"
            mode="icon"
            onClick={onClick}
            disabled={disabled}
            className={`size-8 ${className}`}
          >
            {icon}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
