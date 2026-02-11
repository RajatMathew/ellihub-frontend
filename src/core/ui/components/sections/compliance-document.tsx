import { Check, Download, FileText, X } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { cn } from '@app/lib/utils';

export interface ComplianceDocumentProps {
  name: string;
  status: 'valid' | 'expired' | 'missing';
  date?: string;
  onDownload?: () => void;
  className?: string;
}

const statusConfig = {
  valid: {
    icon: Check,
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    label: 'VALID',
    labelColor: 'text-emerald-600',
    dateColor: 'text-emerald-600',
  },
  expired: {
    icon: X,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-50',
    label: 'EXPIRED',
    labelColor: 'text-red-600',
    dateColor: 'text-red-600',
  },
  missing: {
    icon: FileText,
    iconColor: 'text-gray-400',
    iconBg: 'bg-gray-50',
    label: 'MISSING',
    labelColor: 'text-gray-500',
    dateColor: 'text-gray-500',
  },
};

export function ComplianceDocument({
  name,
  status,
  date,
  onDownload,
  className,
}: ComplianceDocumentProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-sm border border-gray-200 bg-background px-4 py-3 transition-colors hover:bg-gray-50',
        className
      )}
    >
      {/* Left: Icon and Info */}
      <div className="flex flex-1 items-center gap-3">
        {/* Status Icon */}
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-sm',
            config.iconBg
          )}
        >
          <Icon className={cn('size-4.5', config.iconColor)} />
        </div>

        {/* Document Info */}
        <div className="flex-1 space-y-0.5">
          <div className="text-[13px] font-bold text-gray-900">{name}</div>
          <div className="flex items-center gap-2 text-[12px]">
            <span className={cn('font-semibold', config.labelColor)}>{config.label}</span>
            {date && (
              <>
                <span className="text-gray-300">&bull;</span>
                <span className={cn('font-medium', config.dateColor)}>{date}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Download Button */}
      {onDownload && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          className="size-8 shrink-0 text-gray-400 hover:text-gray-600"
        >
          <Download className="size-4" />
          <span className="sr-only">Download {name}</span>
        </Button>
      )}
    </div>
  );
}
