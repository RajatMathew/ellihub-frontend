import { useState } from 'react';

import {
  DetailPageHeader,
  FormPageHeader,
  ListPageHeader,
  type ActionDef,
} from '@/app/components/page-header';
import {
  AlertTriangle,
  Calendar,
  Pencil,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';

/**
 * Dev-only preview of the page-header system.
 *
 * Every preset is rendered against realistic data so the shape can be reviewed
 * before modules are migrated onto it. Not routed in production builds.
 */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {/* pt-7.5 absorbs the header's own -mt-7.5 full-bleed pull, which would
          otherwise slide each header up over this section's label. */}
      <div className="border border-border bg-background px-4 pt-7.5 lg:px-7.5">{children}</div>
    </section>
  );
}

const detailActions: ActionDef[] = [
  { label: 'Edit Profile', icon: Pencil, to: 'edit' },
  { label: 'Edit Profile', icon: Pencil, to: 'edit', placement: 'overflow' },
  {
    label: 'Archive Vendor',
    icon: Trash2,
    placement: 'overflow',
    destructive: true,
    onClick: () => {},
  },
];

const gatedActions: ActionDef[] = [
  { label: 'Always visible', icon: Plus },
  { label: 'Hidden — boolean false', icon: Plus, enabled: false },
  {
    label: 'Hidden — capability unmet',
    icon: Plus,
    enabled: { resource: 'nothing', action: 'read' },
  },
];

export function PageHeaderKit() {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="container-fluid py-7.5">
      <h1 className="mb-8 text-xl font-medium text-foreground">Page header kit</h1>

      <Section label="ListPageHeader — unfiltered">
        <ListPageHeader
          title="Vendors"
          summary={{ total: 34, filtered: false, label: 'Vendors' }}
          actions={[{ label: 'Add Vendor', icon: Plus, to: 'create', placement: 'primary' }]}
        />
      </Section>

      <Section label="ListPageHeader — filtered, plus a secondary action">
        <ListPageHeader
          title="Cost Codes"
          summary={{ total: 1, filtered: true }}
          actions={[
            { label: 'Categories', icon: Pencil, to: 'categories' },
            { label: 'Add Cost Code', icon: Plus, placement: 'primary', onClick: () => {} },
          ]}
        />
      </Section>

      <Section label="ListPageHeader — loading">
        <ListPageHeader title="Invoices" summary={{ total: 0, filtered: false }} isLoading />
      </Section>

      <Section label="ListPageHeader — custom description replaces the summary">
        <ListPageHeader
          title="Prime Change Orders"
          summary={{ total: 12, filtered: false }}
          description={
            <span className="text-sm text-muted-foreground">
              Fieldwire Project: Ridgeline Tower | Last synced: 2 hours ago
            </span>
          }
          actions={[{ label: 'Sync now', icon: RefreshCcw, onClick: () => {} }]}
        />
      </Section>

      <Section label="DetailPageHeader — every title-row region at once">
        <DetailPageHeader
          backLabel="Purchase Orders"
          title="PO-1042"
          identifier="Rev 2"
          status={{ value: 'ISSUED' }}
          badges={[
            { label: 'Material' },
            { label: 'Overdue', variant: 'destructive', icon: AlertTriangle },
          ]}
          references={[{ label: 'RFQ-014', to: 'rfqs/014' }]}
          meta={[
            { label: 'Vendor', value: 'Millwood LLC', icon: ShieldAlert },
            { label: 'Expected', value: '14 Mar 2024', icon: Calendar },
          ]}
          actions={detailActions}
          panel={{ open: panelOpen, onOpen: () => setPanelOpen(true) }}
        />
      </Section>

      <Section label="DetailPageHeader — editable status">
        <DetailPageHeader
          backLabel="RFQs"
          title="Classroom Casework"
          identifier="RFQ #014"
          status={{
            value: 'DRAFT',
            selectedId: 'draft',
            options: [
              { id: 'draft', label: 'Draft' },
              { id: 'published', label: 'Published' },
            ],
            onChange: () => {},
          }}
        />
      </Section>

      <Section label="DetailPageHeader — loading">
        <DetailPageHeader
          backLabel="Employees"
          title=""
          meta={[{ label: 'Role', value: '' }]}
          isLoading
        />
      </Section>

      <Section label="DetailPageHeader — tabs in the header bar">
        <DetailPageHeader
          backLabel="Employees"
          title="Dana Whitfield"
          meta={[{ label: 'Role', value: 'Project Manager' }]}
          tabs={{
            ariaLabel: 'Employee sections',
            items: [
              { label: 'Overview', value: 'overview' },
              { label: 'Documents', value: 'documents' },
              { label: 'Time Off', value: 'pto' },
            ],
          }}
        />
      </Section>

      <Section label="FormPageHeader — create">
        <FormPageHeader
          title="Add New Vendor"
          submitLabel="Create Vendor"
          backLabel="Vendors"
          isSubmitting={false}
        />
      </Section>

      <Section label="FormPageHeader — edit, submitting, with an extra action">
        <FormPageHeader
          title="Edit Vendor"
          submitLabel="Save Changes"
          backLabel="Millwood LLC"
          description="Changes apply to every project this vendor is on."
          isSubmitting
          actions={[{ label: 'Fill with mock data', onClick: () => {} }]}
        />
      </Section>

      <Section label="Capability gating — two of three actions are filtered out">
        <ListPageHeader
          title="Gating demo"
          summary={{ total: 3, filtered: false }}
          actions={gatedActions}
        />
      </Section>
    </div>
  );
}
