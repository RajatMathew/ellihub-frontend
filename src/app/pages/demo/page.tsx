import { TabsList, TabsTrigger } from "@app/components/ui/tabs";
import { Tabs } from "@app/components/ui/tabs";
import {
  Toolbar,
  ToolbarWrapper,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarActions,
} from "@app/components/toolbar/toolbar";
import { Button } from "@app/components/ui/button";
import { Funnel, Eye, MessageSquareCode, Search } from "lucide-react";
import { Link } from "react-router-dom";

function Demo() {
  return (
    <div className="container-fluid">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Dashboard</ToolbarPageTitle>
        </ToolbarHeading>
        <ToolbarWrapper>
          <Tabs
            defaultValue="overview"
            className="text-sm text-muted-foreground"
          >
            <TabsList size="xs">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
            </TabsList>
          </Tabs>

          <ToolbarActions>
            <Button size="sm" variant="outline">
              <Funnel />
              Sort
            </Button>
            <Button size="sm" variant="outline">
              <Eye />
              View
            </Button>
            <Button size="sm" variant="outline">
              <MessageSquareCode />
              Filter
            </Button>
            <Button size="sm" variant="outline" mode="icon">
              <Search />
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>
      <div className="p-4 h-[60vh] bg-muted rounded-lg">
        <Link to="../project/2323">Project 1</Link>
      </div>
    </div>
  );
}

export default Demo;
