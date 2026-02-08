import { Toolbar, ToolbarHeading, ToolbarPageTitle } from '@app/components/toolbar/toolbar';

export default function MainFilesPage() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Files</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>
      <div className="p-4">
        <p className="text-muted-foreground">Files (main).</p>
      </div>
    </div>
  );
}
