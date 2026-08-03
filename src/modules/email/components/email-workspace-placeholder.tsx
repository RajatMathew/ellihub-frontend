import type { EmailWorkspaceView } from '@/modules/email/components/email-workspace-header';
import { CalendarDays, ListTodo } from 'lucide-react';

export function EmailWorkspacePlaceholder({ view }: { view: Exclude<EmailWorkspaceView, 'mail'> }) {
  const isTasks = view === 'tasks';
  const Icon = isTasks ? ListTodo : CalendarDays;

  return (
    <section
      className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 px-6 py-12"
      aria-labelledby={`${view}-placeholder-heading`}
    >
      <div className="max-w-sm text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </div>
        <h2
          id={`${view}-placeholder-heading`}
          className="mt-5 text-lg font-semibold text-foreground"
        >
          {isTasks ? 'Tasks are coming next' : 'Calendar is coming next'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isTasks
            ? 'Mailbox tasks will be organized here without interrupting your email workflow.'
            : 'Deadlines, reminders, and mailbox events will appear here.'}
        </p>
      </div>
    </section>
  );
}
