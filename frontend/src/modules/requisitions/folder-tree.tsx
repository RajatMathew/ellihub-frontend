import { useState } from 'react';

import { cn } from '@app/lib/utils';

// ────────────────────────────────────────────────────────────────────────
// Folder-tree model — a static snapshot that mirrors Peter's real
// OneDrive layout for the Boyland project. When Cofount wires the
// backend to OneDrive/Graph, this data comes from Graph's driveItem
// tree; the render component below doesn't change.
// ────────────────────────────────────────────────────────────────────────
export interface FileNode {
  name: string;
  type: 'file';
  fileUri?: string;             // for real files: served path
  ext?: string;                 // pdf / xlsx / doc / docx / jpg
  sizeKb?: number;
  mtime?: string;               // "2025-11-19"
  tone?: 'default' | 'rejected' | 'live';
}
export interface FolderNode {
  name: string;
  type: 'folder';
  children: TreeNode[];
  notes?: string;
}
export type TreeNode = FileNode | FolderNode;

// Real Boyland tree — reproduced from what Peter shared during examples.
export const BOYLAND_TREE: FolderNode = {
  name: 'Boyland Community Center-2025 - J09856000-0059 - Gilbane',
  type: 'folder',
  children: [
    {
      name: 'Requisitions', type: 'folder', children: [
        { name: 'SOV', type: 'folder', children: [
          { name: 'BOYLAND COMMUNITY CENTER (1).xlsx', type: 'file', ext: 'xlsx', sizeKb: 22, mtime: '2025-03-24' },
          { name: 'BOYLAND COMMUNITY CENTER Finalized.xlsx', type: 'file', ext: 'xlsx', sizeKb: 33, mtime: '2025-03-24', tone: 'live' },
        ]},
        { name: 'Monthly Compliance Forms', type: 'folder', notes: 'blank template library', children: [
          { name: 'Boyland Sub Tier and Supplier Wavier.pdf', type: 'file', ext: 'pdf', sizeKb: 123 },
          { name: 'Boyland Sub Tier and Supplier Wavier.xls', type: 'file', ext: 'xls', sizeKb: 45 },
          { name: 'Certificate of Subcontractor to the Comptroller.doc', type: 'file', ext: 'doc', sizeKb: 60 },
          { name: 'ContractorandSubcontractorNon-DiscriminationCertificate (002).pdf', type: 'file', ext: 'pdf', sizeKb: 68 },
          { name: 'DDC SIGN IN SHEET BLANK.pdf', type: 'file', ext: 'pdf', sizeKb: 30 },
          { name: 'EOP for Gilbane Building Company.pdf', type: 'file', ext: 'pdf', sizeKb: 98 },
          { name: 'RequestforPermissiontoStoreMaterials.pdf', type: 'file', ext: 'pdf', sizeKb: 68 },
          { name: "Subcontractor's Certificate of Non-Discrimination Compliance.doc", type: 'file', ext: 'doc', sizeKb: 55 },
          { name: "Trade Contractor's Sworn Statement.docx", type: 'file', ext: 'docx', sizeKb: 62 },
          { name: 'BillofSale-TransferofTitle_5.30.25.pdf', type: 'file', ext: 'pdf', sizeKb: 587 },
          { name: 'Blumberg Certificate 10.25.pdf', type: 'file', ext: 'pdf', sizeKb: 971 },
        ]},
        { name: 'Stored Materials Paperwork', type: 'folder', children: [
          { name: 'Request for Permission to Store Material 1of 2.doc', type: 'file', ext: 'doc', sizeKb: 44 },
          { name: 'Request for Permission to Store Material 2 of 2.doc', type: 'file', ext: 'doc', sizeKb: 44 },
          { name: 'Stored Material Summary Form 1 of 2.doc', type: 'file', ext: 'doc', sizeKb: 46 },
          { name: 'Stored Material Summary Form 2 of 2.doc', type: 'file', ext: 'doc', sizeKb: 46 },
          { name: 'Affidavit - Vendor to Contractor.doc', type: 'file', ext: 'doc', sizeKb: 41 },
        ]},
        { name: 'CPR', type: 'folder', notes: 'per-vendor payroll archive', children: [
          { name: 'Elli', type: 'folder', children: [
            { name: 'CPR-Boyland - Elli.xlsx', type: 'file', ext: 'xlsx', sizeKb: 88, tone: 'live', mtime: '2026-06-30' },
            { name: '2026-01 - CPR - Boyland.pdf', type: 'file', ext: 'pdf', sizeKb: 1007 },
            { name: '2026-02 - CPR - Boyland.pdf', type: 'file', ext: 'pdf', sizeKb: 2100 },
            { name: '2026-03 - CPR - Boyland.pdf', type: 'file', ext: 'pdf', sizeKb: 499 },
            { name: '2026-04 - CPR - Boyland.pdf', type: 'file', ext: 'pdf', sizeKb: 361 },
            { name: '2026-05 - CPR - Boyland.pdf', type: 'file', ext: 'pdf', sizeKb: 361 },
            { name: '2026-06 - CPR - Boyland.pdf', type: 'file', ext: 'pdf', sizeKb: 294 },
          ]},
          { name: 'Ak International', type: 'folder', children: [
            { name: '2026-03 - CPR - Ak International.pdf', type: 'file', ext: 'pdf', sizeKb: 3200 },
            { name: '2026-04 - CPR - Ak International.pdf', type: 'file', ext: 'pdf', sizeKb: 3200 },
            { name: '2026-05 - CPR - Ak International.pdf', type: 'file', ext: 'pdf', sizeKb: 2000 },
            { name: '2026-06 - CPR - Ak International.pdf', type: 'file', ext: 'pdf', sizeKb: 3300 },
          ]},
        ]},
        { name: '2025', type: 'folder', children: [
          { name: '05 - 2025', type: 'folder', children: [
            { name: 'Payment Req #1', type: 'folder', children: [
              { name: 'Paymentc Req #1-Pencil Copy-Boyland-5-20-2025.pdf', type: 'file', ext: 'pdf', sizeKb: 1900, mtime: '2025-05-20' },
              { name: 'Boyland Sub Tier and Supplier Wavier.pdf', type: 'file', ext: 'pdf', sizeKb: 123 },
              { name: 'CPR - 05-01 to 05-31.pdf', type: 'file', ext: 'pdf', sizeKb: 800 },
            ]},
          ]},
          { name: '06 - 2025', type: 'folder', children: [
            { name: '06 - 2025 - Rejected', type: 'folder', children: [
              { name: '20238805489 Copy.pdf', type: 'file', ext: 'pdf', sizeKb: 2100, tone: 'rejected' },
              { name: 'AIA Package-6.26.pdf', type: 'file', ext: 'pdf', sizeKb: 2200, tone: 'rejected' },
              { name: 'GBC-J09856.000-26-Textura.pdf', type: 'file', ext: 'pdf', sizeKb: 637, tone: 'rejected' },
            ]},
            { name: 'Req Package- 06.01-06.30.pdf', type: 'file', ext: 'pdf', sizeKb: 1900 },
            { name: 'Sworn Statement-06.30.pdf', type: 'file', ext: 'pdf', sizeKb: 777 },
            { name: 'CPR -Boyland Community Center-June.pdf', type: 'file', ext: 'pdf', sizeKb: 1600 },
            { name: 'GBC-J09856.000-26.pdf', type: 'file', ext: 'pdf', sizeKb: 964 },
          ]},
          { name: '07 - 2025', type: 'folder', notes: 'this month split by platform', children: [
            { name: 'Siteline', type: 'folder', children: [
              { name: '07 - 2025 - BCC - SITELINE.pdf', type: 'file', ext: 'pdf', sizeKb: 1900 },
            ]},
            { name: 'Textura', type: 'folder', children: [
              { name: 'BCC - 07 - 2025 - Pencil.pdf', type: 'file', ext: 'pdf', sizeKb: 455 },
              { name: 'BCC - 07 - 2025 -Rejected.pdf', type: 'file', ext: 'pdf', sizeKb: 1900, tone: 'rejected' },
              { name: 'Sworn Statement 07 - 2025.pdf', type: 'file', ext: 'pdf', sizeKb: 777 },
              { name: 'Subcontractor Waiver - 07 - 25.pdf', type: 'file', ext: 'pdf', sizeKb: 117 },
              { name: 'BCC- CPR- 07 - 2025.pdf', type: 'file', ext: 'pdf', sizeKb: 195 },
            ]},
          ]},
          { name: '09 - 2025', type: 'folder', notes: 'stored-materials month — full evidence bundle', children: [
            { name: 'Draw 29 - Complete Package.pdf', type: 'file', ext: 'pdf', sizeKb: 37300 },
            { name: 'EOP for Gilbane Building Company.pdf', type: 'file', ext: 'pdf', sizeKb: 98 },
            { name: 'Certificarte of Subcontractor to the Comptroller - September.pdf', type: 'file', ext: 'pdf', sizeKb: 670 },
            { name: 'Stored Material Bailment Agreement.pdf', type: 'file', ext: 'pdf', sizeKb: 860 },
            { name: 'Stored Material Bill of Sale.pdf', type: 'file', ext: 'pdf', sizeKb: 774 },
            { name: 'Subcontractor Lien Waiver.pdf', type: 'file', ext: 'pdf', sizeKb: 1000 },
            { name: "Subcontractor's Certificate of Compliance  - Sept.pdf", type: 'file', ext: 'pdf', sizeKb: 1000 },
            { name: "Trade Contractor's  Sworn Statement.pdf", type: 'file', ext: 'pdf', sizeKb: 758 },
            { name: 'Pictures of Store Materials.pdf', type: 'file', ext: 'pdf', sizeKb: 19600 },
          ]},
          { name: '10 - 2025', type: 'folder', children: [
            { name: 'EOP for Gilbane Building Company.pdf', type: 'file', ext: 'pdf', sizeKb: 98 },
            { name: 'GBC-J09856.000-30.pdf', type: 'file', ext: 'pdf', sizeKb: 458 },
            { name: 'Permission to Store Material.docx', type: 'file', ext: 'docx' },
            { name: 'Requisition Package 10-25 8.pdf', type: 'file', ext: 'pdf', sizeKb: 539 },
            { name: 'Requisition Package 10-25.pdf', type: 'file', ext: 'pdf', sizeKb: 41600 },
            { name: 'Stored Material Summary Form.docx', type: 'file', ext: 'docx' },
            { name: 'Waiver - AK International - October.pdf', type: 'file', ext: 'pdf', sizeKb: 1500 },
            { name: 'Waivers and Trade Contractor Statement.pdf', type: 'file', ext: 'pdf', sizeKb: 2100 },
            { name: 'Bill of Sale - October.pdf', type: 'file', ext: 'pdf', sizeKb: 1200 },
            { name: 'Blumberg Certificate 10.25.pdf', type: 'file', ext: 'pdf', sizeKb: 1700 },
            { name: 'Certificate of Non Discrimination - 10.25.pdf', type: 'file', ext: 'pdf', sizeKb: 248 },
            { name: 'CPR - Boyland Community Center - Sept, Oct.pdf', type: 'file', ext: 'pdf', sizeKb: 378 },
          ]},
          { name: '11 - 2025', type: 'folder', children: [
            { name: 'Rejected', type: 'folder', children: [
              { name: 'Invoice 6 - Siteline.pdf', type: 'file', ext: 'pdf', sizeKb: 2000, tone: 'rejected' },
              { name: 'Invoice 6 - Textura - Rejected.pdf', type: 'file', ext: 'pdf', sizeKb: 459, tone: 'rejected' },
              { name: 'Compliance Documents.pdf', type: 'file', ext: 'pdf', sizeKb: 263, tone: 'rejected' },
            ]},
            { name: 'Invoice 6 - Textura - Pencil  - 11.19.25.pdf', type: 'file', ext: 'pdf', sizeKb: 2800 },
            { name: 'CPR - Boyland Community Center - November.pdf', type: 'file', ext: 'pdf', sizeKb: 194 },
            { name: 'DDC Documents.pdf', type: 'file', ext: 'pdf', sizeKb: 671 },
            { name: 'Lien Waiver.pdf', type: 'file', ext: 'pdf', sizeKb: 1600 },
            { name: 'RequestforPermissiontoStoreMaterials.pdf', type: 'file', ext: 'pdf', sizeKb: 68 },
            { name: 'BillofSale-TransferofTitle_5.30.25.pdf', type: 'file', ext: 'pdf', sizeKb: 587 },
            { name: 'Certificate of Non Discrimination - 11.25.pdf', type: 'file', ext: 'pdf', sizeKb: 785 },
            { name: 'ContractorandSubcontractorNon-DiscriminationCertificate (002).pdf', type: 'file', ext: 'pdf', sizeKb: 68 },
          ]},
        ]},
      ],
    },
    {
      name: 'Change Orders', type: 'folder', children: [
        { name: 'COLog_BoylandCommunityCenterDDC_01Apr2026.pdf', type: 'file', ext: 'pdf', sizeKb: 394, tone: 'live' },
        { name: 'CO#02 Approval Email.pdf', type: 'file', ext: 'pdf', sizeKb: 88 },
        { name: 'SCO#2 - Elli - MIsc. Changes Through April 2026 (Partially Executed).pdf', type: 'file', ext: 'pdf', sizeKb: 92 },
        { name: '2026-BOYLAND-COMMUNITY-CENTER-Change-Order-30600-0003-Change-Order-based-on-ASI-22 (2).pdf', type: 'file', ext: 'pdf', sizeKb: 95 },
        { name: '2026-BOYLAND-COMMUNITY-CENTER-Change-Order-30600-0004-Modification-of-Cabinets-on-site-AK-International (2).pdf', type: 'file', ext: 'pdf', sizeKb: 88 },
        { name: '2026-BOYLAND-COMMUNITY-CENTER-Change-Order-30600-0005-Change-Order-for-Increase-in-AWP-1-Material (1).pdf', type: 'file', ext: 'pdf', sizeKb: 90 },
      ],
    },
    {
      name: 'Safety', type: 'folder', children: [
        { name: 'Site Specific Safety Plan_Elli_Brownsville Girls Community Center.docx', type: 'file', ext: 'docx' },
      ],
    },
    {
      name: 'Insurance', type: 'folder', children: [
        { name: 'Contractor Certificate_Long Island Metro Builders Corp.pdf', type: 'file', ext: 'pdf' },
      ],
    },
  ],
};

export const TREE_BY_PROJECT: Record<string, FolderNode> = {
  boyland: BOYLAND_TREE,
};

// ────────────────────────────────────────────────────────────────────────
// UI
// ────────────────────────────────────────────────────────────────────────
export function FolderTreeSection({ projectId }: { projectId: string }) {
  const root = TREE_BY_PROJECT[projectId];

  if (!root) {
    return (
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <header className="px-5 py-4 border-b border-border">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            File tree · mirrors OneDrive
          </p>
          <h2 className="text-[16px] font-semibold mt-0.5" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            Project folder anatomy
          </h2>
        </header>
        <div className="p-8 text-center text-[12px] text-muted-foreground italic">
          Pick a project above to see its folder tree.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-baseline gap-3 flex-wrap">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            File tree · mirrors OneDrive
          </p>
          <h2 className="text-[16px] font-semibold mt-0.5" style={{ fontFamily: "'Fraunces','Georgia',serif" }}>
            {root.name}
          </h2>
        </div>
        <span className="ml-auto text-[10.5px] text-muted-foreground font-mono">
          Live rendering of the accounting folder for this project. Peter's OneDrive is the source of truth; Cofount wires the Graph API to load this real-time.
        </span>
      </header>
      <div className="p-2">
        <TreeNodeView node={root} depth={0} defaultOpen={true} />
      </div>
    </section>
  );
}

function TreeNodeView({ node, depth, defaultOpen }: { node: TreeNode; depth: number; defaultOpen?: boolean }) {
  if (node.type === 'file') return <FileRow node={node} depth={depth} />;
  return <FolderRow node={node} depth={depth} defaultOpen={depth < 1 ? true : defaultOpen} />;
}

function FolderRow({ node, depth, defaultOpen }: { node: FolderNode; depth: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState<boolean>(!!defaultOpen);
  const isRejected = /rejected/i.test(node.name);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 text-left',
          isRejected && 'opacity-70'
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <span className="text-[10px] text-muted-foreground w-3 inline-block">{open ? '▾' : '▸'}</span>
        <span className="text-[13px]">📁</span>
        <span className={cn('text-[12.5px] font-semibold', isRejected && 'text-[#dc2626]')}>{node.name}</span>
        {node.notes && (
          <span className="ml-2 text-[10px] text-muted-foreground italic">— {node.notes}</span>
        )}
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{node.children.length} item{node.children.length === 1 ? '' : 's'}</span>
      </button>
      {open && (
        <div>
          {node.children.map((child, i) => (
            <TreeNodeView key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ node, depth }: { node: FileNode; depth: number }) {
  const isLive = node.tone === 'live';
  const isRejected = node.tone === 'rejected';
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/40',
        isRejected && 'opacity-60'
      )}
      style={{ paddingLeft: 8 + depth * 16 }}
    >
      <span className="text-[10px] text-muted-foreground w-3 inline-block"></span>
      <span className="text-[12px]">{iconFor(node.ext)}</span>
      <span className={cn(
        'text-[12px] truncate',
        isLive && 'font-semibold',
        isRejected && 'line-through text-[#dc2626]'
      )}>{node.name}</span>
      {node.mtime && (
        <span className="ml-2 text-[9.5px] font-mono text-muted-foreground whitespace-nowrap">{node.mtime}</span>
      )}
      {isLive && (
        <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-[#2d6a4f] bg-[#e4efe9] px-1.5 py-0.5 rounded">live</span>
      )}
      {isRejected && (
        <span className="text-[9px] font-mono uppercase tracking-[0.08em] text-[#dc2626] bg-[#fdecec] px-1.5 py-0.5 rounded">rejected</span>
      )}
      <span className="ml-auto text-[9.5px] font-mono text-muted-foreground whitespace-nowrap">
        {node.sizeKb ? (node.sizeKb >= 1024 ? (node.sizeKb / 1024).toFixed(1) + ' MB' : node.sizeKb + ' KB') : ''}
      </span>
    </div>
  );
}

function iconFor(ext?: string): string {
  switch ((ext ?? '').toLowerCase()) {
    case 'pdf':  return '📄';
    case 'xlsx':
    case 'xls':  return '📊';
    case 'doc':
    case 'docx': return '📝';
    case 'jpg':
    case 'jpeg':
    case 'png':  return '🖼️';
    default:     return '📎';
  }
}
