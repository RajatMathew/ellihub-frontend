import { Toolbar, ToolbarHeading, ToolbarPageTitle } from '@app/components/toolbar/toolbar';

export default function MainContactsPage() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Contacts</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>
      <div className="p-4">
        <p className="text-muted-foreground">Directory — Contacts.</p>
      </div>
    </div>
  );
}
