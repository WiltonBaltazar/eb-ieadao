import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Progress } from '@/Components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import {
  ChevronLeft,
  Search,
  Users,
  Calendar,
  CheckCircle2,
  Phone,
  X,
  Eye,
  FileSpreadsheet,
  CalendarDays,
} from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';

async function dlXlsx(url: string): Promise<void> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/);
  const filename = match?.[2] ?? 'export.xlsx';
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

interface StudentRow {
  id: number;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  alt_contact: string | null;
  role: 'student' | 'teacher';
  grupo_homogeneo: string | null;
  grupo_homogeneo_label: string | null;
  attended: number;
  total_sessions: number;
  rate: number;
  readiness: string;
  readiness_label: string;
}

interface Props extends PageProps {
  classroom: {
    id: number;
    name: string;
    teacher_names: string[];
    is_active: boolean;
    meeting_day: string | null;
    meeting_time: string | null;
  };
  students: PaginatedData<StudentRow>;
  totalSessions: number;
  gruposOptions: Array<{ value: string; label: string }>;
  filters: { search?: string; grupo_homogeneo?: string; sort_by?: string; sort_dir?: string; per_page?: string; year?: string };
  year: number;
  availableYears: number[];
}

const readinessColors: Record<string, string> = {
  no_classroom:       'bg-slate-100 text-slate-500',
  attendance_ready:   'bg-blue-100 text-blue-700',
  self_service_active:'bg-green-100 text-green-700',
};

const grupoColors: Record<string, string> = {
  homens:   'bg-indigo-100 text-indigo-700',
  senhoras: 'bg-pink-100 text-pink-700',
  jovens:   'bg-amber-100 text-amber-700',
  criancas: 'bg-teal-100 text-teal-700',
};

export default function TurmaAlunos({
  classroom,
  students,
  totalSessions,
  gruposOptions,
  filters,
  year,
  availableYears,
}: Props) {
  const [search, setSearch] = useState(filters.search ?? '');
  const basePath = `/admin/turmas/${classroom.id}/alunos`;
  const { handleSort, handlePerPage } = useTableNav(basePath, filters);

  const applyFilter = (key: string, value: string) => {
    router.get(
      `/admin/turmas/${classroom.id}/alunos`,
      { ...filters, [key]: value || undefined },
      { preserveState: true, preserveScroll: true },
    );
  };

  const clearFilters = () => {
    router.get(`/admin/turmas/${classroom.id}/alunos`, {}, { preserveState: true });
  };

  const hasFilters = !!(filters.search || filters.grupo_homogeneo);

  const avgRate = students.total > 0
    ? Math.round(students.data.reduce((sum, s) => sum + s.rate, 0) / students.data.length)
    : 0;

  return (
    <AdminLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/admin' },
        { label: 'Turmas', href: '/admin/turmas' },
        { label: classroom.name },
      ]}
    >
      <Head title={`${classroom.name} — Alunos`} />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{classroom.name}</h1>
              {classroom.is_active && (
                <Badge className="bg-green-100 text-green-700">Ativa</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-3">
              {classroom.teacher_names?.length > 0 && <span>👤 {classroom.teacher_names.join(', ')}</span>}
              {classroom.meeting_day && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {classroom.meeting_day} {classroom.meeting_time}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => dlXlsx(`/admin/relatorios/turma/${classroom.id}/exportar-excel?year=${year}`)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel {year}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
              onClick={() => dlXlsx(`/admin/relatorios/turma/${classroom.id}/exportar-mapa?year=${year}`)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Presenças no Formato ICI {year}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/turmas">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Turmas
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{students.total}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <Users className="h-3.5 w-3.5" /> Alunos
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold">{totalSessions}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Sessões
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-green-600">{avgRate}%</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Taxa média
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3 items-center">
              {availableYears.length > 1 && (
                <Select
                  value={String(year)}
                  onValueChange={(v) => applyFilter('year', v)}
                >
                  <SelectTrigger className="h-8 w-28">
                    <CalendarDays className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-2 flex-1 min-w-48">
                <Input
                  placeholder="Pesquisar por nome ou telefone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilter('search', search)}
                  className="h-8"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => applyFilter('search', search)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <Select
                value={filters.grupo_homogeneo ?? 'all'}
                onValueChange={(v) => applyFilter('grupo_homogeneo', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {gruposOptions.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasFilters && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-slate-500"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-base">
              {students.total} aluno{students.total !== 1 ? 's' : ''}
              {hasFilters && <span className="text-slate-400 font-normal"> (filtrado)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {students.data.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum aluno encontrado</p>
                {hasFilters && (
                  <p className="text-sm mt-1">
                    Tenta{' '}
                    <button onClick={clearFilters} className="underline">
                      limpar os filtros
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm admin-table">
                    <thead className="border-b border-slate-100 bg-slate-50/50">
                      <tr>
                        <SortableTh label="Nome" column="name" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                        <SortableTh label="Contacto" column="phone" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                        <SortableTh label="Grupo" column="grupo_homogeneo" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                        <th className="text-left px-4 py-3 font-medium text-slate-500">Presenças</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-500">Taxa</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-500">Estado</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {students.data.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/70">
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {s.name}
                            {s.role === 'teacher' && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs ml-2">Professor</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              {s.phone && (
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  <span>{s.phone}</span>
                                </div>
                              )}
                              {s.whatsapp && s.whatsapp !== s.phone && (
                                <div className="text-xs text-slate-400">WA: {s.whatsapp}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {s.grupo_homogeneo ? (
                              <Badge className={`text-xs ${grupoColors[s.grupo_homogeneo] ?? ''}`}>
                                {s.grupo_homogeneo_label}
                              </Badge>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-700">{s.attended}</span>
                            <span className="text-slate-400 text-xs"> / {s.total_sessions}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-24">
                              <Progress value={s.rate} className="h-1.5 flex-1" />
                              <span
                                className={`text-xs font-semibold tabular-nums ${
                                  s.rate >= 75
                                    ? 'text-green-600'
                                    : s.rate >= 50
                                    ? 'text-amber-600'
                                    : 'text-red-500'
                                }`}
                              >
                                {s.rate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-xs ${readinessColors[s.readiness] ?? ''}`}>
                              {s.readiness_label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600">
                              <Link href={`/admin/utilizadores/${s.id}`}>
                                <Eye className="h-3.5 w-3.5" />Ver Detalhes
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {students.data.map((s) => (
                    <div key={s.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-800">
                            {s.name}
                            {s.role === 'teacher' && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs ml-2">Professor</Badge>
                            )}
                          </p>
                          {s.phone && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />{s.phone}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-bold ${
                            s.rate >= 75 ? 'text-green-600' : s.rate >= 50 ? 'text-amber-600' : 'text-red-500'
                          }`}>{s.rate}%</span>
                          <p className="text-xs text-slate-400">{s.attended}/{s.total_sessions} sessões</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.grupo_homogeneo && (
                          <Badge className={`text-xs ${grupoColors[s.grupo_homogeneo] ?? ''}`}>
                            {s.grupo_homogeneo_label}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${readinessColors[s.readiness] ?? ''}`}>
                          {s.readiness_label}
                        </Badge>
                        <Progress value={s.rate} className="h-1 flex-1 min-w-16" />
                        <Button asChild size="sm" variant="ghost" className="h-6 px-2 gap-1 text-xs text-slate-500 ml-auto">
                          <Link href={`/admin/utilizadores/${s.id}`}>
                            <Eye className="h-3 w-3" />Ver Detalhes
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        <TablePagination
          data={students}
          currentPath={basePath}
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>
    </AdminLayout>
  );
}
