import type { ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Archive, FileText, Pencil, type LucideIcon } from 'lucide-react';

import { fillEmailPrompt, type ContextThread } from './agent-fullscreen-rules';

/**
 * The mailbox actions Elliot can run on a mail, as one-click prompts. They
 * mirror the suggestion chips on the empty chat. Each needs a thread to read
 * from, so they wait until one is in context; with several in context the
 * button asks which ones before anything is sent.
 */
type Action = { label: string; icon: LucideIcon; template: string; multi?: boolean };

const ACTIONS: Action[] = [
  { label: 'Summarise thread', icon: FileText, template: 'Summarise {email}.', multi: true },
  { label: 'Archive email', icon: Archive, template: 'Archive {email}.', multi: true },
  {
    label: 'Draft a reply',
    icon: Pencil,
    template: 'Draft a concise reply to {email}.',
    multi: true,
  },
];
export const NEEDS_THREAD = 'Open an email, or add one with +, first.';

type OnStart = (prompt: string, thread?: ContextThread) => void;
type OnAskWhich = (question: { label: string; template: string; multi?: boolean }) => void;

/** Shown on every action, and disables it, while nothing can be sent. */
type Blocked = { blockedReason?: string | null };

/**
 * Wraps a button that sends an email-bound prompt. With no thread in context it
 * is disabled; with one it sends; with several it asks which email first. A
 * template without `{email}` is not bound to a thread and just sends.
 */
export function EmailActionChooser({
  label,
  template,
  multi,
  threads,
  onStart,
  onAskWhich,
  blockedReason,
  children,
}: Blocked & {
  label: string;
  template: string;
  /** Several threads may be picked at once; otherwise exactly one. */
  multi?: boolean;
  threads: ContextThread[];
  onStart: OnStart;
  /** Several threads in context: the question goes into the chat. */
  onAskWhich: OnAskWhich;
  /** The button itself; wrapped in a menu when there is a choice to make. */
  children: (props: { disabled: boolean; title?: string; onClick?: () => void }) => ReactNode;
}) {
  if (blockedReason) return children({ disabled: true, title: blockedReason });
  if (!template.includes('{email}')) {
    return children({ disabled: false, onClick: () => onStart(template) });
  }
  if (threads.length === 0) return children({ disabled: true, title: NEEDS_THREAD });
  if (threads.length === 1) {
    return children({ disabled: false, onClick: () => onStart(fillEmailPrompt(template)) });
  }
  return children({ disabled: false, onClick: () => onAskWhich({ label, template, multi }) });
}

const ITEM_CLASS =
  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent';

/** The rail's fixed mailbox actions; each sends a prompt through the chooser. */
export function RailActions({
  threads,
  onStart,
  onAskWhich,
  compact,
  blockedReason,
}: Blocked & {
  threads: ContextThread[];
  onStart: OnStart;
  onAskWhich: OnAskWhich;
  /** The collapsed rail: icons only. */
  compact: boolean;
}) {
  const chooser = { threads, onStart, onAskWhich, blockedReason };
  if (compact) {
    return (
      <>
        {ACTIONS.map((action) => (
          <RailIconButton key={action.label} action={action} {...chooser} />
        ))}
      </>
    );
  }
  return (
    <div className="flex flex-col px-2">
      {ACTIONS.map((action) => (
        <RailRowButton key={action.label} action={action} {...chooser} />
      ))}
      {threads.length === 0 ? (
        <p className="px-2 pt-1 text-[11px] text-muted-foreground">{NEEDS_THREAD}</p>
      ) : null}
    </div>
  );
}

type RowProps = Blocked & {
  action: Action;
  threads: ContextThread[];
  onStart: OnStart;
  onAskWhich: OnAskWhich;
};

function RailIconButton({ action, ...chooser }: RowProps) {
  const { label, icon: Icon, template, multi } = action;
  return (
    <EmailActionChooser label={label} template={template} multi={multi} {...chooser}>
      {(props) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          title={props.title ?? label}
          {...props}
        >
          <Icon className="size-4" aria-hidden />
        </Button>
      )}
    </EmailActionChooser>
  );
}

function RailRowButton({ action, ...chooser }: RowProps) {
  const { label, icon: Icon, template, multi } = action;
  return (
    <EmailActionChooser label={label} template={template} multi={multi} {...chooser}>
      {(props) => (
        <button type="button" className={ITEM_CLASS} {...props}>
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" aria-hidden />
          </span>
          {label}
        </button>
      )}
    </EmailActionChooser>
  );
}
