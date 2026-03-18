import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { ArrowLeft, CalendarCheck, TrendingUp, Zap, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { PageProps, PaginatedData, AttendanceRecord } from '@/types';
import { TablePagination } from '@/Components/AdminTable';

interface Props extends PageProps {
  attendances: PaginatedData<AttendanceRecord>;
  stats: { attended: number; total: number; rate: number; streak: number };
  filters: Record<string, string>;
}

function SortTh({ label, column, filters, className = '' }: {
  label: string;
  column: string;
  filters: Record<string, string>;
  className?: string;
}) {
  const isActive = filters.sort_by === column;
  const currentDir = filters.sort_dir ?? 'desc';
  const nextDir = isActive && currentDir === 'asc' ? 'desc' : 'asc';

  const handleSort = () => {
    router.get('/minhas-presencas', { ...filters, sort_by: column, sort_dir: nextDir, page: 1 }, { preserveState: true, preserveScroll: true });
  };

  return (
    <th
      className={`text-left px-4 py-3 text-slate-500 font-medium cursor-pointer select-none hover:text-slate-700 transition-colors text-xs ${className}`}
      onClick={handleSort}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === 'asc' ? <ArrowUp className="h-3 w-3 text-slate-700" /> : <ArrowDown className="h-3 w-3 text-slate-700" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-slate-300" />
        )}
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

  const methodBadge = (method: string) => {
    const styles = method === 'qr'
      ? 'border-purple-300 text-purple-700'
      : method === 'auto'
        ? 'border-green-300 text-green-700'
        : 'border-slate-300 text-slate-600';
    const label = method === 'qr' ? 'QR' : method === 'auto' ? 'Auto' : 'Manual';
    return <Badge variant="outline" className={`text-xs ${styles}`}>{label}</Badge>;
  };

  return (
    <StudentLayout>
      <Head title="Minhas Presenças — IEADAO Presenças" />

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Link href="/meu-perfil"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Minhas Presenças</h1>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.attended}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <CalendarCheck className="h-3 w-3" />
                Total
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.rate}%</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Taxa
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.streak}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Sequência
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex gap-2">
              <Input
                placeholder="Pesquisar por nome da sessão…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-8"
              />
              <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="px-0 pt-0">
            {attendances.data.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                <p className="font-medium">Ainda não tens presenças</p>
                <p className="text-sm mt-1">As tuas presenças aparecerão aqui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <SortTh label="Sessão" column="session_title" filters={filters} className="px-6" />
                      <SortTh label="Data" column="session_date" filters={filters} />
                      <th className="text-left px-4 py-3 text-slate-500 font-medium text-xs hidden md:table-cell">Método</th>
                      <SortTh label="Check-in" column="checked_in_at" filters={filters} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attendances.data.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <span className="font-medium text-slate-800">{a.session_title}</span>
                          <p className="text-xs text-slate-400 md:hidden">{methodBadge(a.method)}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{a.session_date}</td>
                        <td className="px-4 py-3 hidden md:table-cell">{methodBadge(a.method)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{a.checked_in_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

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
