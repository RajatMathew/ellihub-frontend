import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  /** Where it goes, as the reader knows it: "Back to {label}". */
  label: string;
  className?: string;
}

/**
 * A link one step back up a hierarchy - out of a folder, say - naming where it
 * lands. A real link, so it opens in a new tab like any other; aligned to the
 * content edge, so the arrow lines up with what is below it.
 */
export function BackLink({ to, label, className }: BackLinkProps) {
  return (
    <Button asChild variant="dim" size="sm" className={cn('-ms-2.5 max-w-full', className)}>
      <Link to={to} title={`Back to ${label}`}>
        <ArrowLeft aria-hidden="true" />
        <span className="truncate">Back to {label}</span>
      </Link>
    </Button>
  );
}
