import { Toolbar, ToolbarHeading, ToolbarPageTitle } from '@app/components/toolbar/toolbar';

export default function MainGeneralContractsPage() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>General Contracts</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>
      <div className="p-4">
        <p className="text-muted-foreground">Directory — General Contracts.</p>
      </div>
    </div>
  );
}
