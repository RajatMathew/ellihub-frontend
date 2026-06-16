const projectStats = [
  ['Active projects', '24'],
  ['Open RFQs', '18'],
  ['Purchase orders', '$1.42M'],
  ['Invoices pending', '$284K'],
];

const workflowRows = [
  ['Prime Contract', 'Budget, schedule, and contract documents', 'Current'],
  ['Vendor Procurement', 'RFQs, purchase orders, and sub change orders', 'In progress'],
  ['Project Files', 'Central folders and supporting documents', 'Synced'],
];

export function CompanyProductPreview() {
  return (
    <div
      className="rounded-lg border bg-card text-card-foreground shadow-xs"
      aria-label="Preview of ElliHub project workspace"
      role="img"
    >
      <div className="border-b px-4 py-3">
        <div className="text-sm font-semibold">Project Command Center</div>
        <div className="text-xs text-muted-foreground">Financial and operational activity at a glance</div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-b p-4">
        {projectStats.map(([label, value]) => (
          <div key={label} className="rounded-md border bg-background p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="space-y-3 p-4">
        {workflowRows.map(([title, description, status]) => (
          <div
            key={title}
            className="grid grid-cols-[1fr_auto] gap-3 rounded-md border bg-background p-3"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{title}</div>
              <div className="text-xs text-muted-foreground">{description}</div>
            </div>
            <div className="text-xs font-medium text-primary">{status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
