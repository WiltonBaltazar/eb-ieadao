import { Link, router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { PaginatedData } from '@/types';

// ── Sortable Table Header ────────────────────────────────────────────────────

interface SortableThProps {
  label: string;
  column: string;
  currentSort?: string;
  currentDir?: string;
  className?: string;
  onSort: (column: string, dir: string) => void;
}

export function SortableTh({ label, column, currentSort, currentDir, className = '', onSort }: SortableThProps) {
  const isActive = currentSort === column;
  const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';

  return (
    <th
      className={`text-left px-4 py-3 text-slate-500 font-medium cursor-pointer select-none hover:text-slate-700 transition-colors ${className}`}
      onClick={() => onSort(column, nextDir)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-slate-700" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-slate-700" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
        )}
      </span>
    </th>
  );
}

// ── Table Pagination Footer ──────────────────────────────────────────────────

interface TablePaginationProps<T> {
  data: PaginatedData<T>;
  currentPath: string;
  params?: Record<string, unknown>;
  perPageOptions?: number[];
  onPerPageChange: (perPage: number) => void;
}

export function TablePagination<T>({
  data,
  perPageOptions = [25, 50, 100],
  onPerPageChange,
}: TablePaginationProps<T>) {
  return (
    <div className="flex items-center justify-between text-sm px-1 flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <p className="text-slate-500">
          {data.from && data.to ? `${data.from}–${data.to} de ${data.total}` : `${data.total} total`}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-xs">Mostrar</span>
          <Select
            value={String(data.per_page)}
            onValueChange={(v) => onPerPageChange(Number(v))}
          >
            <SelectTrigger className="h-7 w-[4.5rem] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {perPageOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {data.last_page > 1 && (
        <div className="flex gap-1.5">
          {data.links.map((link, i) =>
            link.url ? (
              <Link key={i} href={link.url}>
                <Button
                  variant={link.active ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 px-3"
                >
                  {link.label === '&laquo; Previous' ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : link.label === 'Next &raquo;' ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    link.label
                  )}
                </Button>
              </Link>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

// ── Hook helper to build sort/pagination navigation ──────────────────────────

export function useTableNav(basePath: string, currentFilters: Record<string, unknown> = {}) {
  const navigate = (extra: Record<string, unknown>) => {
    const params = { ...currentFilters, ...extra };
    // Remove empty/undefined values
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        cleaned[k] = String(v);
      }
    }
    router.get(basePath, cleaned, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (column: string, dir: string) => {
    navigate({ sort_by: column, sort_dir: dir, page: 1 });
  };

  const handlePerPage = (perPage: number) => {
    navigate({ per_page: perPage, page: 1 });
  };

  return { navigate, handleSort, handlePerPage };
}
