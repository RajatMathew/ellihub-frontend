import { useId, type ComponentProps, type ReactNode } from 'react';

import { DatePickerButton } from '@/app/components/date-time-picker';
import { Label } from '@/app/components/ui/label';
import { formatDateOnly } from '@/app/lib/dates';
import { cn } from '@/app/lib/utils';

import { AgentInput, AgentTextarea } from './agent-streaming-field';

/**
 * The field vocabulary Elliot's cards are drawn in: a small muted label over a
 * full-width control (Aura's layout), or the same label over a read-only box
 * for a value the card cannot change, such as a vendor picked by id.
 */
export function CardTextField({
  label,
  value,
  editable,
  onChange,
  className,
  ...inputProps
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
  className?: string;
} & Omit<ComponentProps<typeof AgentInput>, 'value' | 'onChange' | 'className'>) {
  const id = useId();
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <AgentInput
        id={id}
        value={value}
        disabled={!editable}
        onChange={(event) => onChange(event.target.value)}
        {...inputProps}
      />
    </div>
  );
}

export function CardTextArea({
  label,
  value,
  editable,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <AgentTextarea
        id={id}
        rows={rows}
        value={value}
        disabled={!editable}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function CardReadOnlyField({
  label,
  children,
  detail,
  className,
}: {
  label: string;
  children: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
        <p className="truncate">{children}</p>
        {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}

/** Two fields side by side, stacking when the panel is narrow. */
export function CardFieldRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

export function CardFields({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3">{children}</div>;
}

/** A calendar day through the app's shadcn calendar, never the browser's date input. */
export function CardDateField({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  /** `yyyy-MM-dd`, or empty. */
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {editable ? (
        <DatePickerButton
          value={value}
          onChange={onChange}
          size="md"
          aria-label={label}
          className="w-full justify-start font-normal"
        />
      ) : (
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm">
          {value ? formatDateOnly(value) : '—'}
        </div>
      )}
    </div>
  );
}
