import { ToggleGroup, ToggleGroupItem } from '@/app/components/ui/toggle-group';
import { LayoutDashboard, List } from 'lucide-react';

export type ProjectPortfolioView = 'board' | 'list';

interface ProjectViewSwitcherProps {
  value: ProjectPortfolioView;
  onValueChange: (value: ProjectPortfolioView) => void;
}

export function ProjectViewSwitcher({ value, onValueChange }: ProjectViewSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      aria-label="Project view"
      onValueChange={(nextValue) => {
        if (nextValue === 'board' || nextValue === 'list') onValueChange(nextValue);
      }}
    >
      <ToggleGroupItem value="board" aria-label="Board view" className="h-8 gap-1.5 px-2.5">
        <LayoutDashboard className="size-3.5" />
        <span className="text-xs">Board</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="List view" className="h-8 gap-1.5 px-2.5">
        <List className="size-3.5" />
        <span className="text-xs">List</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
