import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
} from "@app/components/toolbar/toolbar";

export default function MainHrPage() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>HR</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>
      <div className="p-4">
        <p className="text-muted-foreground">HR module.</p>
      </div>
    </div>
  );
}
