// ---------------------------------------------------------------------------
// Details Sidebar — right-hand panel for RFQ detail page
// ---------------------------------------------------------------------------

import { useState } from 'react';

import { ExternalLink, Lock, MessageSquare, Pencil, Plus, Upload } from 'lucide-react';

import { formatDate } from '@app/lib/helpers';
import { cn } from '@app/lib/utils';

import type { RfqDetail } from './types';

export function DetailsSidebar({ rfq }: { rfq: RfqDetail }) {
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  return (
    <aside className="w-[300px] shrink-0 rounded-xl border border-border bg-background overflow-hidden flex flex-col">
      {/* Tab header */}
      <div className="flex items-center border-b border-border">
        {(['details', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              'relative flex items-center gap-1.5 px-5 py-3 text-xs font-semibold uppercase tracking-wider transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab === 'details' ? 'Details' : 'Activity'}
            {tab === 'activity' && (
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-white">
                3
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'details' ? (
        <div className="flex flex-col gap-6 p-5 overflow-y-auto flex-1">
          {/* Project */}
          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Project
            </span>
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{rfq.projectName}</span>
                <span className="text-xs text-muted-foreground">{rfq.projectId}</span>
              </div>
              <ExternalLink className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            </div>
          </div>

          {/* Key dates */}
          <div className="flex flex-col gap-3">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key Dates
            </span>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Issue Date</span>
                <span className="text-xs font-medium text-foreground">
                  {formatDate(rfq.issueDate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Response Due</span>
                <span className="text-xs font-medium text-foreground">
                  {formatDate(rfq.responseDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Created by */}
          <div className="flex flex-col gap-2">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              RFQ Created By
            </span>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {rfq.createdBy.initials}
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {rfq.createdBy.name}
                </span>
                <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {rfq.createdBy.role}
                </span>
              </div>
            </div>
          </div>

          {/* Project notice */}
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs leading-relaxed text-foreground">{rfq.notice}</p>
              <Pencil className="size-3.5 mt-0.5 shrink-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Comment input */}
          <div className="p-4 border-b border-border shrink-0">
            <input
              type="text"
              placeholder="Leave a comment..."
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Timeline feed */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="relative flex flex-col gap-5">
              {/* Vertical connecting line */}
              <div className="absolute left-[17px] top-9 bottom-9 w-px bg-border" />

              {/* 1 — Closed the RFQ */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-foreground shadow-sm">
                  <Lock className="size-3.5 text-white" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                      John Martinez
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 17, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Closed the RFQ
                  </span>
                </div>
              </div>

              {/* 2 — Uploaded Quote · Millwood LLC */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Upload className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                      John Martinez
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 16, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Uploaded Quote{' '}
                    <span className="text-foreground/70 font-medium">· Millwood LLC</span>
                  </span>
                </div>
              </div>

              {/* 3 — Uploaded Quote · Brooklyn Woodcraft */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Upload className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                      John Martinez
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 15, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Uploaded Quote{' '}
                    <span className="text-foreground/70 font-medium">· Brooklyn Woodcraft</span>
                  </span>
                </div>
              </div>

              {/* 4 — Commented */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                      John Martinez
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 12, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Commented
                  </span>
                  <div className="mt-1 rounded-md bg-muted/60 border border-border/60 px-3 py-2.5">
                    <p className="text-[12px] leading-relaxed text-foreground/80">
                      &ldquo;Met with Millwood today. They are confident in meeting the AWI Premium requirements.&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* 5 — Edited the RFQ */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Pencil className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                      John Martinez
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 09, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Edited the RFQ
                  </span>
                </div>
              </div>

              {/* 6 — Created the RFQ */}
              <div className="flex gap-3">
                <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Plus className="size-3.5 text-muted-foreground" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5 pt-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground truncate">
                      John Martinez
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">Jan 08, 2025</span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Created the RFQ
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
