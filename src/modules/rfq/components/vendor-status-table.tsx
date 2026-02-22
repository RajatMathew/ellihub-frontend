import { FileText, MoreHorizontal, Pencil, Plus, Upload, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';

import type { VendorRow } from '@modules/rfq/types';

import { formatCurrency } from '../constants/rfq.constants';
import { StatusBadge } from './status-badge';
import { VendorInitial } from './vendor-initial';

function ThreeDotMenu({ onUpdateQuote }: { onUpdateQuote?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem className="gap-2" onClick={onUpdateQuote}>
          <Pencil className="size-3.5" />
          Update Quote
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive">
          <FileText className="size-3.5" />
          Mark as Declined
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function VendorStatusTable({
  vendors,
  onUploadQuote,
}: {
  vendors: VendorRow[];
  onUploadQuote: (vendor: VendorRow) => void;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Dark header */}
      <div className="flex items-center justify-between gap-3 bg-foreground/90 px-5 py-3">
        <div className="flex items-center gap-2">
          <Zap className="size-3.5 text-white/70" />
          <span className="text-xs font-bold uppercase tracking-widest text-white">
            Vendor Status Log
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-white/20 bg-white/10 text-white text-xs hover:bg-white/20 hover:text-white gap-1.5"
        >
          <Plus className="size-3" />
          Add Vendor
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[220px]">
                Vendor
              </th>
              <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[110px]">
                Status
              </th>
              <th className="px-4 py-3 text-right text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[130px]">
                Quote Amount
              </th>
              <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[110px]">
                Lead Time
              </th>
              <th className="px-4 py-3 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[120px]">
                Quotation
              </th>
              <th className="w-8 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {vendors.map((vendor) => (
              <tr
                key={vendor.id}
                className="transition-colors hover:bg-muted/30 cursor-default"
              >
                {/* Vendor */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <VendorInitial name={vendor.name} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-foreground">
                        {vendor.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{vendor.email}</span>
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <StatusBadge status={vendor.status} />
                </td>

                {/* Quote amount */}
                <td className="px-4 py-3.5 text-right">
                  {vendor.quoteAmount != null ? (
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(vendor.quoteAmount)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">&mdash;</span>
                  )}
                </td>

                {/* Lead time */}
                <td className="px-4 py-3.5">
                  {vendor.leadTime ? (
                    <span className="text-sm text-foreground">{vendor.leadTime}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">&mdash;</span>
                  )}
                </td>

                {/* Quotation action */}
                <td className="px-4 py-3.5">
                  {vendor.quoteAmount != null ? (
                    <Link
                      to={`vendors/${vendor.id}/quote`}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                    >
                      <FileText className="size-3 shrink-0" />
                      View Quote
                    </Link>
                  ) : vendor.status !== 'DECLINED' ? (
                    <button
                      type="button"
                      onClick={() => onUploadQuote(vendor)}
                      className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      <Upload className="size-3 shrink-0" />
                      Upload
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">&mdash;</span>
                  )}
                </td>

                {/* Three-dot */}
                <td className="px-2 py-3.5">
                  <ThreeDotMenu
                    onUpdateQuote={
                      vendor.status === 'WAITING' || vendor.status === 'DECLINED'
                        ? () => onUploadQuote(vendor)
                        : undefined
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
