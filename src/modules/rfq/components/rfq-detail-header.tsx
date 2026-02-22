import { ArrowLeft, Lock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';

import type { RfqDetail } from '@modules/rfq/types';

export function RfqDetailHeader({
  rfq,
  onBack,
}: {
  rfq: RfqDetail;
  onBack: () => void;
}) {
  return (
    <>
      {/* Back nav */}
      <div className="mb-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to RFQs
        </button>
      </div>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-foreground">{rfq.title}</h1>
            <Badge variant="success" appearance="light" size="sm">
              Open
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground font-mono">RFQ #{rfq.rfqNumber}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="size-3.5" />
            Edit RFQ
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="gap-2">
                <Lock className="size-3.5" />
                Mark RFQ as Closed
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="size-3.5" />
                Delete RFQ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
