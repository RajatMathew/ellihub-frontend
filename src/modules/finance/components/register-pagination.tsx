import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import type { QuickBooksRegisterTransactionsResponse } from '@/modules/integrations/schemas/quickbooks.schema';

export const REGISTER_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

type RegisterPaginationData =
  QuickBooksRegisterTransactionsResponse['meta']['pagination'] | undefined;

interface RegisterPaginationProps {
  pagination: RegisterPaginationData;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

export function RegisterPagination({
  pagination,
  onPageChange,
  onSizeChange,
}: RegisterPaginationProps) {
  const page = pagination?.currentPage ?? 1;
  const size = pagination?.itemsPerPage ?? 25;

  return (
    <>
      <span className="text-xs text-muted-foreground">{getPaginationSummary(pagination)}</span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={String(size)} onValueChange={(value) => onSizeChange(Number(value))}>
          <SelectTrigger className="w-full sm:w-28" aria-label="Rows per page">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGISTER_PAGE_SIZE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} rows
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination?.hasPreviousPage}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="min-w-16 text-center text-xs font-medium text-muted-foreground">
            {page} / {pagination?.totalPages ?? 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination?.hasNextPage}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

function getPaginationSummary(pagination: RegisterPaginationData) {
  if (!pagination || pagination.totalItems === 0) return '0 transactions';

  const first = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const last = Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems);
  return `${first} - ${last} of ${pagination.totalItems} transactions`;
}
