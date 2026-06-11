import { useState } from 'react';

import { ArrowUpRight, Edit, ExternalLink, PanelRightClose, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Separator } from '@app/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@app/components/ui/tabs';
import {
  AccountManagerCard,
  ActivityFeed,
  ComplianceDocument,
  ContactCard,
  InfoList,
  PageHeader,
  SectionHeader,
  SectionTable,
  StatsRow,
  type SectionTableColumn,
} from '@core/ui/components/sections';

function DirectoryPage() {
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div>
      {/* Page Header - white background */}
      <div className="bg-white">
        <div className="container-fluid">
          <PageHeader
            breadcrumbs={[{ label: 'Vendors', href: '/directory' }, { label: 'Profile' }]}
            title="Millwood LLC"
            metadata={[
              { label: 'Type', value: 'FABRICATION' },
              { label: 'Tax ID', value: '583920-XT' },
            ]}
            status={{
              label: 'Active',
              variant: 'success',
              withDot: true,
            }}
            actions={[
              {
                label: 'Edit Profile',
                icon: Edit,
                onClick: () => {},
              },
              {
                label: 'Create PO',
                icon: Plus,
                onClick: () => {},
              },
              {
                label: 'Create Invoice',
                icon: Plus,
                onClick: () => {},
              },
              {
                label: 'Create Payment',
                icon: Plus,
                onClick: () => {},
                className: 'bg-teal-600 text-white hover:bg-teal-700 border-teal-600',
              },
            ]}
            moreActions={[
              {
                label: 'Delete Vendor',
                icon: Trash2,
                destructive: true,
              },
            ]}
            onTogglePanel={() => setPanelOpen(!panelOpen)}
            panelOpen={panelOpen}
          />
        </div>
      </div>

      {/* Main Layout: Content + Side Panel */}
      <div className="flex">
        {/* Left / Main Content */}
        <div className="container-fluid min-w-0 flex-1">
          {/* Stats Row */}
          <StatsRow
            items={[
              {
                label: 'Total Committed',
                value: '$154,200',
                description: 'Total active POs',
                variant: 'default',
              },
              {
                label: 'Paid to Date',
                value: '$130,620',
                description: 'Processed checks',
                variant: 'primary',
              },
              {
                label: 'Current Balance',
                value: '$23,580',
                description: 'Pending payments',
                variant: 'success',
              },
              {
                label: 'Compliance Status',
                value: 'EXPIRED',
                description: 'Regulatory check',
                variant: 'danger',
              },
            ]}
          />

          {/* Tabs */}
          <div className="mt-6">
            <Tabs defaultValue="overview">
              <TabsList variant="default" size="lg">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
                <TabsTrigger value="change-orders">Change Orders</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
              </TabsList>

              {/* OVERVIEW Tab */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Two-column: Financial Overview + Info */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Financial Overview */}
                  <div className="overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm">
                    <SectionHeader title="Financial Overview" />
                    <div className="px-6">
                      <InfoList
                        items={[
                          {
                            label: 'Total Committed',
                            value: '$154,200',
                          },
                          {
                            label: 'Total Paid',
                            value: '$130,620',
                            valueClassName: 'text-emerald-600',
                          },
                          {
                            label: 'Retainage Held',
                            value: '$23,920',
                            valueClassName: 'text-orange-500',
                          },
                          {
                            label: 'Current Balance',
                            value: '$23,580',
                            bold: true,
                            valueClassName: 'text-blue-600 text-[17px]',
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm">
                    <SectionHeader title="Info" />
                    <div className="px-6">
                      <InfoList
                        items={[
                          {
                            label: 'Payment Terms',
                            value: 'NET 30',
                          },
                          {
                            label: 'Retainage %',
                            value: '10%',
                          },
                          {
                            label: 'Default Status',
                            value: 'ACTIVE',
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Team Directory */}
                <div className="overflow-hidden rounded-sm border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <h3 className="text-[14px] font-bold tracking-wide text-gray-900 uppercase dark:text-white">
                      Team Directory
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-sm px-3 text-[12px] font-bold tracking-wide uppercase"
                    >
                      <Plus className="size-3.5 stroke-[2.5]" />
                      Add Contact
                    </Button>
                  </div>
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    <ContactCard
                      name="JOHN SMITH"
                      role="Primary / Project Manager"
                      email="jsmith@millwoodllc.com"
                      phone="(718) 555-0192"
                      initials="JS"
                      badge="PRIMARY"
                      badgeVariant="primary"
                    />
                    <ContactCard
                      name="SARAH MILLER"
                      role="Accounting"
                      email="accounts@millwoodllc.com"
                      phone="(718) 555-0195"
                      initials="SM"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* PROJECTS Tab */}
              <TabsContent value="projects" className="mt-6 space-y-0">
                <SectionTable
                  title="Project Assignments"
                  columns={projectColumns}
                  data={projectData}
                  getRowKey={(row) => row.jobNumber}
                  searchPlaceholder="Search projects..."
                />
              </TabsContent>

              <TabsContent value="purchase-orders" className="mt-6">
                <div className="rounded-sm border border-gray-200 bg-white p-8 shadow-sm">
                  <p className="text-[13px] text-gray-500">Purchase orders content...</p>
                </div>
              </TabsContent>

              <TabsContent value="change-orders" className="mt-6">
                <div className="rounded-sm border border-gray-200 bg-white p-8 shadow-sm">
                  <p className="text-[13px] text-gray-500">Change orders content...</p>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="mt-6">
                <div className="rounded-sm border border-gray-200 bg-white p-8 shadow-sm">
                  <p className="text-[13px] text-gray-500">Payments content...</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Detail Panel */}
        {panelOpen && (
          <aside className="hidden w-[320px] shrink-0 border-l border-gray-200 bg-white lg:block">
            {/* Panel Tabs: Details / Activity */}
            <Tabs defaultValue="details">
              <div className="flex items-center border-b border-gray-200">
                <TabsList variant="line" size="md" className="flex-1 border-b-0 px-4">
                  <TabsTrigger
                    value="details"
                    className="text-[13px] font-semibold data-[state=active]:border-gray-900 data-[state=active]:text-gray-900"
                  >
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="text-[13px] font-semibold data-[state=active]:border-gray-900 data-[state=active]:text-gray-900"
                  >
                    Activity
                    <Badge size="xs" variant="secondary" shape="circle" className="ml-1">
                      5
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPanelOpen(false)}
                  className="mr-3 size-7 shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <PanelRightClose className="size-4" />
                  <span className="sr-only">Close panel</span>
                </Button>
              </div>

              {/* Details Panel */}
              <TabsContent value="details" className="mt-0 p-5">
                <div className="space-y-6">
                  {/* Verification & Compliance */}
                  <div>
                    <h4 className="mb-4 text-[11px] font-semibold tracking-[0.05em] text-gray-400 uppercase">
                      Verification & Compliance
                    </h4>
                    <div className="space-y-3 text-[13px]">
                      <div className="flex justify-between">
                        <span className="font-medium tracking-wide text-gray-500 uppercase">
                          Established Date
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">2024-01-10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium tracking-wide text-gray-500 uppercase">
                          Last Review Date
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">2025-01-24</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Compliance Documents */}
                  <div>
                    <h4 className="mb-4 text-[11px] font-semibold tracking-[0.05em] text-gray-400 uppercase">
                      Compliance Documents
                    </h4>
                    <div className="space-y-2">
                      <ComplianceDocument
                        name="W9 FORM"
                        status="valid"
                        date="2025-12-31"
                        onDownload={() => {}}
                      />
                      <ComplianceDocument
                        name="GENERAL LIABILITY"
                        status="expired"
                        date="2024-11-15"
                        onDownload={() => {}}
                      />
                      <ComplianceDocument
                        name="WORKERS COMP"
                        status="missing"
                        onDownload={() => {}}
                      />
                    </div>
                    <Button
                      variant="dashed"
                      className="mt-3 h-9 w-full rounded-sm text-[12px] font-bold tracking-wide uppercase"
                    >
                      <Plus className="size-3.5 stroke-[2.5]" />
                      Add Document
                    </Button>
                  </div>

                  <Separator />

                  {/* Account Manager */}
                  <div>
                    <h4 className="mb-4 text-[11px] font-semibold tracking-[0.05em] text-gray-400 uppercase">
                      Account Manager
                    </h4>
                    <AccountManagerCard name="JOHN MARTINEZ" role="Assistant PM" initials="JM" />
                  </div>

                  <Separator />

                  {/* Official Website */}
                  <div>
                    <Button
                      variant="ghost"
                      className="h-auto w-full justify-between gap-2 rounded-sm px-0 py-2 text-[13px] font-bold tracking-wide text-gray-900 uppercase"
                    >
                      <span className="flex items-center gap-2">
                        <ExternalLink className="size-4 text-gray-500" />
                        Official Website
                      </span>
                      <ArrowUpRight className="size-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Activity Panel */}
              <TabsContent value="activity" className="mt-0 p-5">
                <ActivityFeed
                  items={[
                    {
                      id: '1',
                      user: 'SYSTEM ADMIN',
                      action: 'Vendor status updated from Prospect to Active',
                      timestamp: '2024-01-10',
                    },
                    {
                      id: '2',
                      user: 'SARAH MILLER',
                      action: 'New W9 Form uploaded: millwood_w9_2025.pdf',
                      timestamp: '2024-05-12',
                    },
                    {
                      id: '3',
                      user: 'JOHN MARTINEZ',
                      action: 'Purchase Order PO-14120-001 issued for $45,000.00',
                      timestamp: '2024-05-15',
                    },
                    {
                      id: '4',
                      user: 'SARAH MILLER',
                      action: 'Payment CHK-10293 processed for $45,000.00',
                      timestamp: '2024-06-15',
                    },
                    {
                      id: '5',
                      user: 'COMPLIANCE BOT',
                      action: 'General Liability insurance marked as EXPIRED',
                      timestamp: '2024-11-15',
                    },
                  ]}
                />
              </TabsContent>
            </Tabs>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ---- Status Badge helper ---- */

function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
}) {
  const styles = {
    success:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400',
    danger: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400',
    default: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <span
      className={`inline-block rounded-sm border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

/* ---- Helpers ---- */

function getPaymentVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'FULLY PAID':
      return 'success';
    case 'ONGOING':
      return 'warning';
    case 'PAID':
      return 'success';
    default:
      return 'default';
  }
}

function getRetainageVariant(
  status: string
): 'success' | 'warning' | 'danger' | 'info' | 'default' {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'ONGOING':
      return 'warning';
    case 'RETAINAGE PENDING':
      return 'danger';
    default:
      return 'default';
  }
}

/* ---- Project Data ---- */

const projectData = [
  {
    jobNumber: '14120',
    name: 'P.S. 397B',
    gc: 'Navillus',
    manager: 'John Martinez',
    terms: 'NET 30',
    payment: 'ONGOING',
    retainage: 'ONGOING',
    retainageHeld: '$15,420',
    value: '$154,200',
  },
  {
    jobNumber: '14121',
    name: 'P.S. 158Q',
    gc: 'MPCC',
    manager: 'Sarah Wilson',
    terms: 'NET 45',
    payment: 'ONGOING',
    retainage: 'RETAINAGE PENDING',
    retainageHeld: '$8,500',
    value: '$85,000',
  },
  {
    jobNumber: '14122',
    name: 'I.S. 238K',
    gc: 'Triton',
    manager: 'Mike Ross',
    terms: 'NET 30',
    payment: 'FULLY PAID',
    retainage: 'PAID',
    retainageHeld: '$0',
    value: '$125,000',
  },
  {
    jobNumber: '14125',
    name: 'HIGH SCHOOL 455',
    gc: 'Skanska',
    manager: 'David Chen',
    terms: 'N/A',
    payment: 'ACTIVE',
    retainage: 'ONGOING',
    retainageHeld: '$0',
    value: '$0',
  },
  {
    jobNumber: '14126',
    name: 'J.H.S. 189',
    gc: 'Judlau',
    manager: 'Robert Fox',
    terms: 'N/A',
    payment: 'ACTIVE',
    retainage: 'ONGOING',
    retainageHeld: '$0',
    value: '$0',
  },
  {
    jobNumber: '14127',
    name: 'P.S. 122M',
    gc: 'Turner',
    manager: 'Amanda Lee',
    terms: 'N/A',
    payment: 'ACTIVE',
    retainage: 'ONGOING',
    retainageHeld: '$0',
    value: '$0',
  },
  {
    jobNumber: '14128',
    name: 'P.S. 135R',
    gc: 'Gilbane',
    manager: 'Steve Wright',
    terms: 'N/A',
    payment: 'TENDERING',
    retainage: 'ONGOING',
    retainageHeld: '$0',
    value: '$0',
  },
  {
    jobNumber: '14129',
    name: 'I.S. 318K',
    gc: 'Lendlease',
    manager: 'Jessica Brown',
    terms: 'N/A',
    payment: 'ACTIVE',
    retainage: 'ONGOING',
    retainageHeld: '$0',
    value: '$0',
  },
  {
    jobNumber: '14130',
    name: 'P.S. 201Q',
    gc: 'Plaza',
    manager: 'Kevin Hart',
    terms: 'N/A',
    payment: 'PROSPECT',
    retainage: 'ONGOING',
    retainageHeld: '$0',
    value: '$0',
  },
  {
    jobNumber: '14131',
    name: 'BANCROFT HALL',
    gc: 'Pavarini',
    manager: 'Chris Evans',
    terms: 'N/A',
    payment: 'TENDERING',
    retainage: 'ONGOING',
    retainageHeld: '$0',
    value: '$0',
  },
];

/* ---- Project Columns ---- */

type ProjectRow = (typeof projectData)[number];

const projectColumns: SectionTableColumn<ProjectRow>[] = [
  {
    key: 'jobNumber',
    header: 'Job #',
    render: (row) => <span className="text-[13px] text-gray-500">{row.jobNumber}</span>,
  },
  {
    key: 'name',
    header: 'Project Name',
    textOverflow: 'truncate',
    tooltip: (row) => row.name,
    render: (row) => <span className="text-[13px] font-bold text-gray-900">{row.name}</span>,
  },
  {
    key: 'gc',
    header: 'GC',
    render: (row) => <span className="text-[13px] text-gray-700">{row.gc}</span>,
  },
  {
    key: 'manager',
    header: 'Manager',
    render: (row) => <span className="text-[13px] text-gray-700">{row.manager}</span>,
  },
  {
    key: 'terms',
    header: 'Terms',
    render: (row) => <span className="text-[13px] font-medium text-gray-700">{row.terms}</span>,
  },
  {
    key: 'payment',
    header: 'Payment',
    render: (row) => <StatusBadge label={row.payment} variant={getPaymentVariant(row.payment)} />,
  },
  {
    key: 'retainage',
    header: 'Retainage',
    render: (row) => (
      <StatusBadge label={row.retainage} variant={getRetainageVariant(row.retainage)} />
    ),
  },
  {
    key: 'retainageHeld',
    header: 'Retainage Held',
    align: 'right',
    render: (row) => (
      <span className="text-[13px] font-bold text-orange-500">{row.retainageHeld}</span>
    ),
  },
  {
    key: 'value',
    header: 'Value',
    align: 'right',
    render: (row) => <span className="text-[13px] font-bold text-gray-900">{row.value}</span>,
  },
];

export default DirectoryPage;
