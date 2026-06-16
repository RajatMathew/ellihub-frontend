import { type ReactNode } from 'react';

import { type LucideIcon } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { cn } from '@app/lib/utils';

export interface SectionHeaderAction {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  variant?: 'default' | 'primary';
}

export interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  actions?: SectionHeaderAction[];
  children?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  icon: Icon,
  actions,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between bg-gray-900 px-5 py-3 dark:bg-gray-800',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="size-4 text-white" />}
        <h3 className="text-[13px] font-bold tracking-[0.05em] text-white uppercase">{title}</h3>
      </div>

      {(actions || children) && (
        <div className="flex items-center gap-2">
          {children}
          {actions?.map((action, index) => {
            const ActionIcon = action.icon;
            const isPrimary = action.variant === 'primary';
            return (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={action.onClick}
                className={cn(
                  'h-7 rounded-sm border-0 px-3 text-[12px] font-bold tracking-wide uppercase',
                  isPrimary
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-background text-gray-900 hover:bg-gray-100'
                )}
              >
                {ActionIcon && <ActionIcon className="size-3.5 stroke-[2.5]" />}
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
