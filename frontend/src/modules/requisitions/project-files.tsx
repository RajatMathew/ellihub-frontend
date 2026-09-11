import { useMemo, useState } from 'react';

import { cn } from '@app/lib/utils';

import { ChipPill, fmtDate, usd } from './format';
import {
  CHANGE_ORDERS,
  DOC_RECORDS,
  DOC_REQUIREMENTS,
  PHOTOS,
  PHOTO_CATEGORY_META,
  PROJECTS,
  SOVS,
  getAllReqsSortedByMonthDesc,
  type Photo,
} from './data';
import { CO_STATUS_META, STAGE_META } from './stages';

/**
 * Project-scoped file browser — Peter's model. Pick a project, see every
 * category as a collapsible section, dive into each to click any file.
 *
 * Categories, in the order they appear:
 *   1. SOV                (the schedule of values file(s), rev history)
 *   2. Requisitions       (one row per month; drill in → per-month files)
 *   3. Change Orders      (Elli → GC, from the CO record)
 *   4. Photos             (grid, filterable by category)
 *   5. Compliance Docs    (the per-month filings, from the ledger)
 *   6. Templates          (Monthly Compliance Forms + Stored Materials Paperwork)
 *   7. CPR                (by-vendor payroll archive)
 *   8. Safety             (project-level plans)
 *   9. Insurance          (per-counterparty certs)
 *
 * Sections shown-only-if-they-have-content. First one starts open by default,
 * the rest collapsed — so a fresh project doesn't overwhelm the page.
 */
export function ProjectFilesView() {
  // Default to Boyland since it's the fully-seeded project (real CO PDFs,
  // vendor CPRs, template library, photos). Peter can switch via the picker.
  const [projectId, setProjectId] = useState<string>(
    PROJECTS.find(p => p.id === 'boyland')?.id ?? PROJECTS[0].id
  );
  const project = PROJECTS.find(p => p.id === projectId);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Project picker */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="p-4 flex items-center gap-4 flex-wrap">
          <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Project
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-[13.5px] font-semibold min-w-[280px]"
          >
            {PROJECTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {project && (
            <div className="ml-auto text-right text-[11px] text-muted-foreground">
              <p><b className="text-foreground">{project.gc}</b> · {project.paymentTerms}</p>
              <p className="font-mono">Contract <span className="tabular-nums">{usd(project.contractValue)}</span></p>
            </div>
          )}
        </div>
      </section>

      {project && <ProjectAllSections projectId={project.id} />}
    </div>
  );
}

function ProjectAllSections({ projectId }: { projectId: string }) {
  const sov = SOVS.find(s => s.projectId === projectId);
  const reqs = getAllReqsSortedByMonthDesc(projectId);
  const cos = CHANGE_ORDERS.filter(c => c.projectId === projectId);
  const photos = PHOTOS.filter(p => p.projectId === projectId);
  const complianceRecords = DOC_RECORDS.filter(dc => dc.projectId === projectId);
  // Templates: for Boyland we surface the actual folders. For other projects we
  // still show placeholder counts (0) so PMs know these categories exist.
  const isBoyland = projectId === 'boyland';

  return (
    <div className="space-y-3">
      <Section
        title="SOV"
        subtitle="Schedule of Values — the master file with rev history in sheets"
        count={sov ? 1 : 0}
        defaultOpen={true}
      >
        <SovSection projectId={projectId} />
      </Section>

      <Section
        title="Requisitions"
        subtitle="Every month on this project — pencil, final, and rejected versions"
        count={reqs.length}
        defaultOpen={reqs.length > 0}
      >
        <RequisitionsSection projectId={projectId} />
      </Section>

      <Section
        title="Change Orders"
        subtitle="Elli → GC. Approved COs feed the SOV."
        count={cos.length}
        defaultOpen={cos.length > 0}
      >
        <ChangeOrdersSection projectId={projectId} />
      </Section>

      <Section
        title="Photos"
        subtitle="Stored-material evidence + project labels + jobsite"
        count={photos.length}
        defaultOpen={false}
      >
        <PhotosGridSection photos={photos} />
      </Section>

      <Section
        title="Compliance Documents"
        subtitle="Waivers · sworn statements · CPRs · MWBE · everything the final rides with"
        count={complianceRecords.length}
        defaultOpen={false}
      >
        <ComplianceSection projectId={projectId} />
      </Section>

      {isBoyland && (
        <>
          <Section
            title="Templates · Monthly Compliance Forms"
            subtitle="Blank forms the project reuses every month"
            count={BOYLAND_TEMPLATES.length}
            defaultOpen={false}
          >
            <FileListSection files={BOYLAND_TEMPLATES} />
          </Section>

          <Section
            title="Templates · Stored Materials Paperwork"
            subtitle="Multi-part forms for the stored-materials workflow"
            count={BOYLAND_STORED_MATERIALS.length}
            defaultOpen={false}
          >
            <FileListSection files={BOYLAND_STORED_MATERIALS} />
          </Section>

          <Section
            title="CPR"
            subtitle="Certified payroll — per vendor, per month"
            count={BOYLAND_CPR_ELLI.length + BOYLAND_CPR_AK.length}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <VendorCprBlock vendor="Elli" master="CPR-Boyland - Elli.xlsx" files={BOYLAND_CPR_ELLI} />
              <VendorCprBlock vendor="Ak International" files={BOYLAND_CPR_AK} />
            </div>
          </Section>

          <Section
            title="Safety"
            subtitle="Project-level plans"
            count={1}
            defaultOpen={false}
          >
            <FileListSection files={[
              { name: 'Site Specific Safety Plan_Elli_Brownsville Girls Community Center.docx', ext: 'docx' },
            ]} />
          </Section>

          <Section
            title="Insurance"
            subtitle="Certificates from every contractor on the job"
            count={1}
            defaultOpen={false}
          >
            <FileListSection files={[
              { name: 'Contractor Certificate_Long Island Metro Builders Corp.pdf', ext: 'pdf' },
            ]} />
          </Section>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Section chrome — collapsible dropdown per category
// ────────────────────────────────────────────────────────────────────────
function Section({
  title, subtitle, count, defaultOpen, children,
}: {
  title: string;
  subtitle: string;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3 flex items-center gap-3 hover:bg-muted/30 text-left transition-colors"
      >
        <span className="text-[11px] text-muted-foreground font-mono w-3">{open ? '▾' : '▸'}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-semibold" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            {title}
          </h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        <span className={cn(
          'font-mono text-[10.5px] px-2 py-0.5 rounded-full',
          count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {count} {count === 1 ? 'item' : 'items'}
        </span>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Section renderers
// ────────────────────────────────────────────────────────────────────────
function SovSection({ projectId }: { projectId: string }) {
  const sov = SOVS.find(s => s.projectId === projectId);
  if (!sov) {
    return <p className="px-5 py-6 text-[12px] text-muted-foreground italic text-center">No SOV yet for this project.</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {sov.fileUri && (
        <FileRowLink
          fileUri={sov.fileUri}
          fileName={sov.fileName ?? 'SOV.xlsx'}
          badge={<ChipPill tone="success">LIVE · Rev {sov.rev}</ChipPill>}
          meta={`${sov.fileSizeKb ?? '?'} KB · ${sov.status}`}
        />
      )}
      {/* Placeholder "prior revision" — real system pulls from Excel sheet history */}
      {sov.rev > 1 && (
        <div className="px-5 py-2 text-[11px] text-muted-foreground italic">
          Rev history lives inside the workbook — see the "GBC MARKUPS" and "FINAL PROPOSED" sheets in the .xlsx above.
        </div>
      )}
    </ul>
  );
}

function RequisitionsSection({ projectId }: { projectId: string }) {
  const reqs = getAllReqsSortedByMonthDesc(projectId);
  if (reqs.length === 0) {
    return <p className="px-5 py-6 text-[12px] text-muted-foreground italic text-center">No requisitions filed yet.</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {reqs.map(req => {
        const stage = STAGE_META[req.stage];
        return (
          <li key={req.id} className="px-5 py-2.5 flex items-center gap-3">
            <span className="font-mono text-[11px] font-semibold w-16">Req #{String(req.seq).padStart(3, '0')}</span>
            <span className="text-[11.5px] text-muted-foreground font-mono w-20">{req.month}</span>
            <span className="text-[12px] flex-1 min-w-0">
              {req.fileUri ? (
                <a href={req.fileUri} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                  📄 {req.fileName}
                </a>
              ) : (
                <span className="text-muted-foreground italic">no file uploaded</span>
              )}
            </span>
            <span className="tabular-nums text-[11.5px] font-semibold whitespace-nowrap">
              {req.amount > 0 ? usd(req.amount) : '—'}
            </span>
            <ChipPill tone={stage.tone as any}>{stage.label}</ChipPill>
          </li>
        );
      })}
    </ul>
  );
}

function ChangeOrdersSection({ projectId }: { projectId: string }) {
  const cos = CHANGE_ORDERS.filter(c => c.projectId === projectId);
  if (cos.length === 0) {
    return <p className="px-5 py-6 text-[12px] text-muted-foreground italic text-center">No change orders on this project.</p>;
  }
  return (
    <ul className="divide-y divide-border/60">
      {cos.map(co => {
        const st = CO_STATUS_META[co.status];
        return (
          <li key={co.id} className="px-5 py-2.5 flex items-center gap-3">
            <span className="font-mono text-[11px] font-semibold w-16">{co.number}</span>
            <span className="text-[12px] flex-1 min-w-0">
              {co.fileUri ? (
                <a href={co.fileUri} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                  📄 {co.fileName ?? co.title}
                </a>
              ) : (
                <span>{co.title}</span>
              )}
            </span>
            <span className={cn(
              'tabular-nums text-[11.5px] font-semibold whitespace-nowrap',
              co.amount >= 0 ? 'text-[#2d6a4f]' : 'text-[#c75e40]'
            )}>
              {co.amount >= 0 ? '+' : ''}{usd(co.amount)}
            </span>
            <ChipPill tone={st.tone as any}>{st.label}</ChipPill>
          </li>
        );
      })}
    </ul>
  );
}

function PhotosGridSection({ photos }: { photos: Photo[] }) {
  const [category, setCategory] = useState<'all' | Photo['category']>('all');
  const cats: ('all' | Photo['category'])[] = ['all', 'stored-material', 'project-label', 'sign-in-sheet', 'jobsite', 'delivery', 'other'];
  const filtered = photos.filter(p => category === 'all' || p.category === category);

  if (photos.length === 0) {
    return <p className="px-5 py-6 text-[12px] text-muted-foreground italic text-center">No photos on this project yet.</p>;
  }
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {cats.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors',
              category === c
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-accent'
            )}
          >
            {c === 'all' ? 'All' : PHOTO_CATEGORY_META[c].label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="text-[12px] text-muted-foreground italic text-center py-4">No photos in that category.</p>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {filtered.map(p => (
            <a key={p.id} href={p.fileUri} target="_blank" rel="noreferrer" className="block rounded-md border border-border bg-muted/30 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-[4/3] bg-muted flex items-center justify-center relative">
                <img
                  src={p.fileUri} alt={p.caption}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.ph')) {
                      const ph = document.createElement('div');
                      ph.className = 'ph text-[28px]';
                      ph.textContent = p.category === 'stored-material' ? '📦' : p.category === 'project-label' ? '🏷️' : p.category === 'sign-in-sheet' ? '📝' : p.category === 'delivery' ? '🚚' : p.category === 'jobsite' ? '🏗️' : '📷';
                      parent.appendChild(ph);
                    }
                  }}
                />
              </div>
              <div className="p-2.5">
                <p className="text-[11.5px] font-semibold leading-snug">{p.caption}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">{p.takenAt}{p.month ? ` · req ${p.month}` : ''}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ComplianceSection({ projectId }: { projectId: string }) {
  const records = DOC_RECORDS.filter(dc => dc.projectId === projectId);
  const grouped = useMemo(() => {
    const m = new Map<string, typeof records>();
    for (const r of records) {
      const arr = m.get(r.month) ?? [];
      arr.push(r);
      m.set(r.month, arr);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [records]);

  if (records.length === 0) {
    return <p className="px-5 py-6 text-[12px] text-muted-foreground italic text-center">No compliance documents filed yet.</p>;
  }
  return (
    <div className="p-2">
      {grouped.map(([month, rows]) => (
        <div key={month} className="mb-3 last:mb-0">
          <p className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground bg-muted/40 rounded">
            {month} · {rows.length} document{rows.length === 1 ? '' : 's'}
          </p>
          <ul className="divide-y divide-border/60">
            {rows.map(dc => {
              const req = DOC_REQUIREMENTS.find(r => r.id === dc.requirementId);
              return (
                <li key={dc.id} className="px-3 py-2 flex items-center gap-3 text-[12px]">
                  <span className="text-[13px]">{dc.fileUri ? '📄' : '·'}</span>
                  <span className="flex-1 min-w-0 truncate">
                    {dc.fileUri ? (
                      <a href={dc.fileUri} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {req?.form}
                      </a>
                    ) : req?.form}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground w-32 truncate">
                    {req?.owner === 'vendor' ? req?.vendorName : 'Ours'}
                  </span>
                  <ChipPill tone={dc.status === 'filed' ? 'success' : dc.status === 'received' ? 'warning' : 'danger'}>
                    {dc.status}
                  </ChipPill>
                  <span className="w-20 font-mono text-[10.5px] text-muted-foreground text-right">
                    {dc.filedAt ? fmtDate(dc.filedAt) : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function VendorCprBlock({ vendor, master, files }: { vendor: string; master?: string; files: { name: string; sizeKb?: number }[] }) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <p className="px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground bg-muted/40">
        {vendor} · {files.length + (master ? 1 : 0)} files
      </p>
      <ul className="divide-y divide-border/60 text-[12px]">
        {master && (
          <li className="px-3 py-2 flex items-center gap-3">
            <span>📊</span>
            <span className="font-semibold flex-1">{master}</span>
            <ChipPill tone="success">MASTER · live</ChipPill>
          </li>
        )}
        {files.map(f => (
          <li key={f.name} className="px-3 py-2 flex items-center gap-3">
            <span>📄</span>
            <span className="flex-1">{f.name}</span>
            {f.sizeKb && <span className="text-[10px] font-mono text-muted-foreground">{f.sizeKb} KB</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FileListSection({ files }: { files: { name: string; ext?: string; sizeKb?: number }[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {files.map(f => (
        <li key={f.name} className="px-5 py-2 flex items-center gap-3 text-[12px]">
          <span>{f.ext === 'xlsx' || f.ext === 'xls' ? '📊' : f.ext === 'doc' || f.ext === 'docx' ? '📝' : '📄'}</span>
          <span className="flex-1">{f.name}</span>
          {f.sizeKb && <span className="text-[10px] font-mono text-muted-foreground">{f.sizeKb} KB</span>}
        </li>
      ))}
    </ul>
  );
}

function FileRowLink({ fileUri, fileName, badge, meta }: { fileUri: string; fileName: string; badge?: React.ReactNode; meta?: string }) {
  return (
    <li className="px-5 py-2.5 flex items-center gap-3">
      <span>📊</span>
      <a href={fileUri} target="_blank" rel="noreferrer" className="flex-1 min-w-0 text-primary hover:underline font-semibold truncate">
        {fileName}
      </a>
      {meta && <span className="text-[10.5px] font-mono text-muted-foreground">{meta}</span>}
      {badge}
    </li>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Static Boyland lists — reproduced from Peter's real drive
// ────────────────────────────────────────────────────────────────────────
const BOYLAND_TEMPLATES = [
  { name: 'Boyland Sub Tier and Supplier Wavier.pdf', ext: 'pdf', sizeKb: 123 },
  { name: 'Boyland Sub Tier and Supplier Wavier.xls', ext: 'xls', sizeKb: 45 },
  { name: 'Certificate of Subcontractor to the Comptroller.doc', ext: 'doc', sizeKb: 60 },
  { name: 'ContractorandSubcontractorNon-DiscriminationCertificate (002).pdf', ext: 'pdf', sizeKb: 68 },
  { name: 'DDC SIGN IN SHEET BLANK.pdf', ext: 'pdf', sizeKb: 30 },
  { name: 'EOP for Gilbane Building Company.pdf', ext: 'pdf', sizeKb: 98 },
  { name: 'RequestforPermissiontoStoreMaterials.pdf', ext: 'pdf', sizeKb: 68 },
  { name: "Subcontractor's Certificate of Non-Discrimination Compliance.doc", ext: 'doc', sizeKb: 55 },
  { name: "Trade Contractor's Sworn Statement.docx", ext: 'docx', sizeKb: 62 },
  { name: 'BillofSale-TransferofTitle_5.30.25.pdf', ext: 'pdf', sizeKb: 587 },
  { name: 'Blumberg Certificate 10.25.pdf', ext: 'pdf', sizeKb: 971 },
];

const BOYLAND_STORED_MATERIALS = [
  { name: 'Request for Permission to Store Material 1of 2.doc', ext: 'doc', sizeKb: 44 },
  { name: 'Request for Permission to Store Material 2 of 2.doc', ext: 'doc', sizeKb: 44 },
  { name: 'Stored Material Summary Form 1 of 2.doc', ext: 'doc', sizeKb: 46 },
  { name: 'Stored Material Summary Form 2 of 2.doc', ext: 'doc', sizeKb: 46 },
  { name: 'Affidavit - Vendor to Contractor.doc', ext: 'doc', sizeKb: 41 },
];

const BOYLAND_CPR_ELLI = [
  { name: '2026-01 - CPR - Boyland.pdf', sizeKb: 1007 },
  { name: '2026-02 - CPR - Boyland.pdf', sizeKb: 2100 },
  { name: '2026-03 - CPR - Boyland.pdf', sizeKb: 499 },
  { name: '2026-04 - CPR - Boyland.pdf', sizeKb: 361 },
  { name: '2026-05 - CPR - Boyland.pdf', sizeKb: 361 },
  { name: '2026-06 - CPR - Boyland.pdf', sizeKb: 294 },
];

const BOYLAND_CPR_AK = [
  { name: '2026-03 - CPR - Ak International.pdf', sizeKb: 3200 },
  { name: '2026-04 - CPR - Ak International.pdf', sizeKb: 3200 },
  { name: '2026-05 - CPR - Ak International.pdf', sizeKb: 2000 },
  { name: '2026-06 - CPR - Ak International.pdf', sizeKb: 3300 },
];
