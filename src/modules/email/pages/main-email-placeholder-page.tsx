import { useState } from 'react';

import { EmailListPane } from '@/modules/email/components/email-list-pane';
import {
  EmailMailToolbar,
  type EmailListFilter,
} from '@/modules/email/components/email-mail-toolbar';
import { EmailReadingPane } from '@/modules/email/components/email-reading-pane';
import {
  EmailWorkspaceHeader,
  type EmailWorkspaceView,
} from '@/modules/email/components/email-workspace-header';
import { EmailWorkspacePlaceholder } from '@/modules/email/components/email-workspace-placeholder';
import { EmailCalendarView } from '@/modules/email/components/calendar/email-calendar-view';
import { useSearchParams } from 'react-router-dom';

interface MainEmailPlaceholderPageProps {
  mailbox: 'procurement@ellicorp.com' | 'requisitions@ellicorp.com' | 'contracts@ellicorp.com';
}

export function MainEmailPlaceholderPage({ mailbox }: MainEmailPlaceholderPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EmailListFilter>('all');
  const activeView = getWorkspaceView(searchParams.get('view'));

  const setActiveView = (view: EmailWorkspaceView) => {
    const next = new URLSearchParams(searchParams);
    if (view === 'mail') next.delete('view');
    else next.set('view', view);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="flex h-[calc(100dvh-var(--header-height-mobile))] min-w-0 flex-col overflow-hidden bg-background lg:h-[calc(100dvh-var(--header-height)-var(--page-margin)*2)]">
      <EmailWorkspaceHeader
        mailboxAddress={mailbox}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {activeView === 'mail' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <EmailMailToolbar
            selectedFolder="inbox"
            filter={filter}
            search={search}
            composeDisabled
            onFilterChange={setFilter}
            onSearchChange={setSearch}
          />
          <div className="flex min-h-0 flex-1 gap-3 bg-muted/30 p-3 lg:gap-4 lg:p-4">
            <EmailListPane
              mailbox={mailbox}
              folder="inbox"
              folderLabel="Project emails"
              emails={[]}
              search={search}
              onSearchChange={setSearch}
            />
            <div className="hidden min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-background lg:flex">
              <EmailReadingPane email={null} mailboxAddress={mailbox} />
            </div>
          </div>
        </div>
      ) : (
        activeView === 'calendar' ? (
          <EmailCalendarView />
        ) : (
          <EmailWorkspacePlaceholder view={activeView} />
        )
      )}
    </div>
  );
}

function getWorkspaceView(value: string | null): EmailWorkspaceView {
  return value === 'tasks' || value === 'calendar' ? value : 'mail';
}
