import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import {
  CalendarCheck, TrendingUp, Zap, Search, XCircle,
  ArrowUp, ArrowDown, ArrowUpDown, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { PageProps, PaginatedData, AttendanceRecord } from '@/types';
import { TablePagination } from '@/Components/AdminTable';

interface Props extends PageProps {
  attendances: PaginatedData<AttendanceRecord>;
  stats: { attended: number; missed: number; total: number; rate: number; streak: number };
  filters: Record<string, string>;
}

const methodLabel: Record<string, string> = {
  qr: 'QR Code',
  auto: 'Auto',
  manual: 'Manual',
};
const methodStyle: Record<string, string> = {
  qr: 'bg-purple-100 text-purple-700',
  auto: 'bg-green-100 text-green-700',
  manual: 'bg-slate-100 text-slate-600',
};

function SortTh({ label, column, filters }: { label: string; column: string; filters: Record<string, string> }) {
  const isActive = filters.sort_by === column;
  const currentDir = filters.sort_dir ?? 'desc';
  const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';
  const handleSort = () => {
    router.get('/minhas-presencas', { ...filters, sort_by: column, sort_dir: nextDir, page: 1 }, { preserveState: true, preserveScroll: true });
  };
  return (
    <th className="text-left px-4 py-3 text-slate-500 font-medium cursor-pointer select-none hover:text-slate-700 transition-colors text-xs" onClick={handleSort}>
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive
          ? currentDir === 'asc' ? <ArrowUp className="h-3 w-3 text-brand-primary" /> : <ArrowDown className="h-3 w-3 text-brand-primary" />
          : <ArrowUpDown className="h-3 w-3 text-slate-300" />}
      </span>
    </th>
  );
}

export default function MinhasPresencas({ attendances, stats, filters }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');

  const handleSearch = () => {
    router.get('/minhas-presencas', { ...filters, search, page: 1 }, { preserveState: true });
  };

  const handlePerPage = (perPage: number) => {
    router.get('/minhas-presencas', { ...filters, per_page: perPage, page: 1 }, { preserveState: true, preserveScroll: true });
  };

  const rateColor = stats.rate >= 75 ? 'text-green-600' : stats.rate >= 50 ? 'text-amber-500' : 'text-red-500';
  const rateBg   = stats.rate >= 75 ? 'bg-green-50 border-green-200' : stats.rate >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <StudentLayout>
      <Head title="Minhas Presenças — IEADAO" />

      <div className="space-y-5">
        {/* Page header */}
        <div className="pt-1">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Histórico</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Minhas Presenças</h1>
        </div>

        {/* Stats — 4 cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3.5 text-center shadow-sm">
            <div className="flex items-center justify-center mb-1.5">
              <div className="h-8 w-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                <CalendarCheck className="h-4 w-4 text-brand-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">{stats.attended}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">Presenças</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3.5 text-center shadow-sm">
            <div className="flex items-center justify-center mb-1.5">
              <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">{stats.missed}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">Faltas</p>
          </div>

          <div className={`rounded-2xl border px-4 py-3.5 text-center shadow-sm ${rateBg}`}>
            <div className="flex items-center justify-center mb-1.5">
              <div className="h-8 w-8 rounded-lg bg-white/70 flex items-center justify-center">
                <TrendingUp className={`h-4 w-4 ${rateColor}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold tabular-nums ${rateColor}`}>{stats.rate}%</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mt-0.5">Taxa</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3.5 text-center shadow-sm">
            <div className="flex items-center justify-center mb-1.5">
              <div className="h-8 w-8 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-brand-accent" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">{stats.streak}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">Sequência</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Pesquisar por nome da aula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-10 rounded-xl border-slate-200 focus:border-brand-primary"
          />
          <Button size="sm" variant="outline" onClick={handleSearch} className="h-10 w-10 rounded-xl shrink-0 p-0">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* List / table */}
        {attendances.data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 py-14 text-center shadow-sm">
            <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-slate-200" />
            <p className="font-semibold text-slate-500">Ainda não tens presenças</p>
            <p className="text-sm text-slate-400 mt-1">As tuas presenças aparecerão aqui.</p>
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="md:hidden space-y-2">
              {attendances.data.map((a) => (
                <Link key={a.id} href={a.session_url} className="block group">
                  <div className="bg-white rounded-xl border border-slate-100 px-4 py-3.5 flex items-center gap-3 shadow-sm hover:border-brand-primary/20 hover:shadow-md transition-all">
                    <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{a.session_title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-slate-400">{a.session_date}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${methodStyle[a.method] ?? 'bg-slate-100 text-slate-500'}`}>
                          {methodLabel[a.method] ?? a.method}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand-primary transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    <SortTh label="Sessão" column="session_title" filters={filters} />
                    <SortTh label="Data" column="session_date" filters={filters} />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs">Método</th>
                    <SortTh label="Check-in" column="checked_in_at" filters={filters} />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendances.data.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{a.session_title}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{a.session_date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${methodStyle[a.method] ?? 'bg-slate-100 text-slate-500'}`}>
                          {methodLabel[a.method] ?? a.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{a.checked_in_at}</td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild size="sm" variant="outline" className="text-xs h-7 rounded-lg">
                          <Link href={a.session_url}>Detalhes</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <TablePagination
          data={attendances}
          currentPath="/minhas-presencas"
          params={filters}
          perPageOptions={[15, 25, 50]}
          onPerPageChange={handlePerPage}
        />
      </div>
    </StudentLayout>
  );
}
