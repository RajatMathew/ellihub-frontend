import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import { Pagination, PaginationContent, PaginationItem } from '@app/components/ui/pagination';
import type { CostCode } from '@modules/catalog/schemas/costcode.schema';

const DEFAULT_PAGE_SIZE = 10;

export function CostCodesTable({
  data,
  count = 0,
  page = 1,
  size = DEFAULT_PAGE_SIZE,
  onPageChange,
  onDelete,
}: {
  data?: CostCode[];
  count?: number;
  page?: number;
  size?: number;
  onPageChange?: (page: number) => void;
  onDelete?: (id: string) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / size));
  const start = (page - 1) * size;
  const end = Math.min(start + size, count);

  if (!data?.length && count === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No cost codes</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="w-0 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium">{row.code}</td>
                <td className="px-4 py-3">{row.name}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.costCodeCategory?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.description ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`${row.id}`}>View</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`${row.id}/edit`} state={row}>
                        Edit
                      </Link>
                    </Button>
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(row.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {count > 0 && onPageChange && (
        <Pagination>
          <PaginationContent className="flex flex-wrap items-center justify-between gap-2">
            <PaginationItem className="text-muted-foreground text-sm">
              Showing {data?.length ? start + 1 : 0}–{end} of {count}
            </PaginationItem>
            <PaginationItem className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
