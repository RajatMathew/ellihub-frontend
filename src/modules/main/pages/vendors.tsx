import { Toolbar, ToolbarHeading, ToolbarPageTitle } from '@app/components/toolbar/toolbar';

export default function MainVendorsPage() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Vendors</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>
      <div className="p-4">
        <p className="text-muted-foreground">Directory — Vendors.</p>
      </div>
    </div>
  );
}
