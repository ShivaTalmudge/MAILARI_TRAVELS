import React, { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchValue?: string;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
  };
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  actions?: (row: T) => React.ReactNode;
  rowClassName?: (row: T) => string;
}

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  emptyMessage = 'No records found.',
  emptyIcon,
  searchable,
  searchPlaceholder = 'Search...',
  onSearch,
  searchValue,
  pagination,
  sortConfig,
  onSort,
  actions,
  rowClassName,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalSearch(e.target.value);
    onSearch?.(e.target.value);
  }, [onSearch]);

  const allColumns = actions
    ? [...columns, { key: '_actions', label: 'Actions', className: 'text-right' } as Column<T>]
    : columns;

  return (
    <div className="w-full">
      {searchable && (
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue !== undefined ? searchValue : internalSearch}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      )}

      <div className="rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Mobile View (Cards) */}
        <div className="block md:hidden bg-slate-50 divide-y divide-slate-200">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {emptyIcon && <div className="text-slate-300 mb-2">{emptyIcon}</div>}
              <p className="text-sm">{emptyMessage}</p>
            </div>
          ) : (
            data.map((row, i) => (
              <div key={i} className={cn('p-4 space-y-3 bg-white', rowClassName?.(row))}>
                {columns.map((col) => (
                  <div key={col.key} className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase">{col.label}</span>
                    <div className="text-sm text-slate-800 break-words">
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </div>
                  </div>
                ))}
                {actions && (
                  <div className="pt-2 mt-2 border-t border-slate-100 flex justify-end">
                    {actions(row)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {allColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
                      col.sortable && 'cursor-pointer select-none hover:bg-slate-100',
                      col.className
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && onSort && (
                        <span className="text-slate-400">
                          {sortConfig?.key === col.key ? (
                            sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={allColumns.length} />)
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={allColumns.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      {emptyIcon && <div className="text-slate-300">{emptyIcon}</div>}
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'transition-colors hover:bg-slate-50',
                      rowClassName?.(row)
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4 py-3 text-sm text-slate-700 whitespace-nowrap', col.className)}>
                        {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3 text-right">
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 bg-brand-600 text-white rounded text-xs font-medium">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
