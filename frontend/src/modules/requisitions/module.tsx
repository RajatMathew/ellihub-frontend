import { useState } from 'react';

import { cn } from '@app/lib/utils';

import { ProjectsTab } from './projects-tab';
import { SovTab } from './sov-tab';
import { RequisitionsTab } from './requisitions-tab';
import { ChangeOrdersTab } from './change-orders-tab';
import { DocumentsTab } from './documents-tab';

type Tab = 'projects' | 'sov' | 'reqs' | 'cos' | 'docs';

const TABS: { key: Tab; label: string; desc: string }[] = [
  { key: 'projects', label: 'Projects',   desc: 'Every project — Onboarding · Active · Fully billed · Archived. Pick the one you are working on.' },
  { key: 'sov',  label: 'SOV',           desc: 'Schedule of Values — first in line on every project. No approved SOV, no billing.' },
  { key: 'reqs', label: 'Requisitions',  desc: 'Every project this month, from Draft to Paid.' },
  { key: 'cos',  label: 'Change Orders', desc: 'Elli → GC change orders. Once approved, the amount flows into the SOV and rolls into the next requisition.' },
  { key: 'docs', label: 'Documents',     desc: 'Templates on top, ledger below, photos included. Same row appears on each requisition.' },
];

export default function RequisitionsModule() {
  // Projects is the front door (the list you pick from); SOV stays first in
  // line inside a project's workflow.
  const [tab, setTab] = useState<Tab>('projects');
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f8f4ed]">
      <header className="shrink-0 px-6 pt-5 pb-3 border-b border-border bg-card">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Accounting</p>
        <h1
          className="text-[26px] font-semibold leading-tight mt-0.5"
          style={{ fontFamily: "'Fraunces','Georgia',serif" }}
        >
          Requisitions
        </h1>
        <p className="text-[12.5px] text-muted-foreground mt-1">{TABS.find(t => t.key === tab)?.desc}</p>
        <nav className="mt-4 flex gap-1" role="tablist">
          {TABS.map(t => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-2 text-[13px] font-semibold rounded-t-md transition-colors border-b-2',
                  active
                    ? 'text-primary bg-primary/5 border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent'
                )}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'projects' && <ProjectsTab onGoTo={setTab} />}
        {tab === 'sov'  && <SovTab />}
        {tab === 'reqs' && <RequisitionsTab />}
        {tab === 'cos'  && <ChangeOrdersTab />}
        {tab === 'docs' && <DocumentsTab />}
      </div>
    </div>
  );
}
