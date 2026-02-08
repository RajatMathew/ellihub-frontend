import { Toolbar, ToolbarHeading, ToolbarPageTitle } from '@app/components/toolbar/toolbar';

export default function MainCostCodesPage() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Cost Codes</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>
      <div className="p-4">
        <p className="text-muted-foreground">Catalog — Cost Codes.</p>
      </div>
    </div>
  );
}
