import { Link } from "react-router-dom";
import {
  Toolbar,
  ToolbarHeading,
  ToolbarPageTitle,
} from "@app/components/toolbar/toolbar";

export default function MainProjectsPage() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Projects</ToolbarPageTitle>
        </ToolbarHeading>
      </Toolbar>
      <div className="p-4">
        <p className="text-muted-foreground mb-4">Project list and dashboard.</p>
        <Link to="../project/demo" className="text-primary underline">
          Open demo project
        </Link>
      </div>
    </div>
  );
}
