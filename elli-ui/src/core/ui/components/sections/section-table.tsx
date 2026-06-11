import * as React from 'react';
import { useState, type ReactNode } from 'react';

import { Search, type LucideIcon } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { Input } from '@app/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { cn } from '@app/lib/utils';

import { SectionHeader, type SectionHeaderAction } from './section-header';

export interface SectionTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  textOverflow?: 'truncate' | 'scroll' | 'wrap';
  tooltip?: (row: T) => ReactNode;
  render: (row: T) => ReactNode;
}

export interface SectionTableProps<T> {
  title: string;
  icon?: LucideIcon;
  columns: SectionTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  actions?: SectionHeaderAction[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  className?: string;
}

export function SectionTable<T>({
  title,
  icon,
  columns,
  data,
  getRowKey,
  actions,
  searchPlaceholder,
  onSearch,
  onRowClick,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  emptyMessage = 'No data found.',
  className,
}: SectionTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = data.slice(startIndex, endIndex);

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(1);
  }

  function getPageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-sm border border-gray-200 bg-background shadow-sm',
        className
      )}
    >
      <SectionHeader title={title} icon={icon} actions={actions}>
        {searchPlaceholder && (
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch?.(e.target.value)}
              className="h-7 w-45 rounded-sm border-gray-600 bg-gray-800 pl-8 text-[12px] text-white placeholder:text-gray-400"
            />
          </div>
        )}
      </SectionHeader>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-5 py-3 text-[11px] font-semibold tracking-wide text-gray-500',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-8 text-center text-[13px] text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-gray-100 transition-colors hover:bg-gray-50',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => {
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-5 py-4',
                          col.align === 'right' && 'text-right',
                          col.align === 'center' && 'text-center',
                          col.className
                        )}
                      >
                        <SectionTableCellContent
                          textOverflow={col.textOverflow}
                          tooltip={col.tooltip?.(row)}
                        >
                          {col.render(row)}
                        </SectionTableCellContent>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3">
        <div className="flex items-center gap-2 text-[13px] text-gray-600">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="h-7 rounded-sm border border-gray-300 bg-background px-2 text-[13px]"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span>per page</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-gray-600">
          <span>
            {totalItems === 0 ? '0 of 0' : `${startIndex + 1}-${endIndex} of ${totalItems}`}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded-sm text-gray-400"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              &lt;
            </Button>
            {getPageNumbers().map((p) => (
              <Button
                key={p}
                variant="outline"
                size="icon"
                onClick={() => setPage(p)}
                className={cn(
                  'size-7 rounded-sm',
                  p === page && 'bg-gray-900 text-white hover:bg-gray-800'
                )}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="icon"
              className="size-7 rounded-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              &gt;
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTableCellContent({
  children,
  textOverflow,
  tooltip,
}: {
  children: ReactNode;
  textOverflow?: 'truncate' | 'scroll' | 'wrap';
  tooltip?: ReactNode;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  React.useLayoutEffect(() => {
    if (textOverflow !== 'truncate') {
      setIsOverflowing(false);
      return;
    }

    const element = contentRef.current;
    if (!element) return;

    const checkOverflow = () => {
      setIsOverflowing(
        element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight
      );
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);

    return () => observer.disconnect();
  }, [children, textOverflow, tooltip]);

  const content = (
    <div
      ref={contentRef}
      className={cn(
        'min-w-0 max-w-full',
        textOverflow === 'truncate' && 'truncate',
        textOverflow === 'scroll' &&
          'max-h-24 overflow-auto whitespace-pre-wrap break-words pr-1 text-left',
        textOverflow === 'wrap' && 'whitespace-normal break-words'
      )}
    >
      {children}
    </div>
  );

  if (textOverflow !== 'truncate' || !tooltip || !isOverflowing) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-96 whitespace-pre-wrap break-words text-left">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
