import { Inbox, Users } from 'lucide-react';

interface MainEmailPlaceholderPageProps {
  mailbox: 'procurement@ellicorp.com' | 'requisitions@ellicorp.com' | 'contracts@ellicorp.com';
}

export function MainEmailPlaceholderPage({ mailbox }: MainEmailPlaceholderPageProps) {
  return (
    <main className="flex h-[calc(100dvh-var(--header-height-mobile))] items-center justify-center overflow-auto bg-muted/20 px-4 py-10 lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)] lg:px-8">
      <section
        className="w-full max-w-xl rounded-xl border border-border bg-background px-6 py-10 text-center shadow-xs sm:px-10"
        aria-labelledby="main-mailbox-heading"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
          <Inbox aria-hidden="true" className="size-5" strokeWidth={1.8} />
        </div>

        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          <Users aria-hidden="true" className="size-3.5" />
          Main mailbox
        </div>

        <h1
          id="main-mailbox-heading"
          className="mt-4 break-words text-2xl font-semibold tracking-tight text-foreground"
        >
          {mailbox}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          This mailbox is shared with everyone in Elli. Its messages and actions will appear here
          when the main inbox integration is ready.
        </p>
      </section>
    </main>
  );
}
