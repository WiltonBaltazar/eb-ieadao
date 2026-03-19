import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Progress } from '@/Components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { CheckCircle2, X, ChevronLeft, Phone, QrCode, Hand, Calendar, Users } from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';

interface Student {
  id: number;
  name: string;
  phone: string | null;
  alt_contact: string | null;
  grupo_homogeneo: string | null;
  grupo_homogeneo_label: string | null;
  classroom_id: number | null;
  classroom_name: string | null;
  readiness: string;
  readiness_label: string;
}

interface SessionRow {
  id: number;
  title: string;
  session_date: string;
  teacher_name: string | null;
  attended: boolean;
  method: string | null;
  method_label: string | null;
  checked_in_at: string | null;
}

interface Stats {
  attended: number;
  total: number;
  rate: number;
}

interface EnrollmentEntry {
  classroom_name: string | null;
  enrolled_at: string | null;
  transferred_at: string | null;
}

interface EnrollmentHistoryRow {
  year: number;
  classroom_id: number | null;
  classroom_name: string | null;
  entries: EnrollmentEntry[];
}

interface Props extends PageProps {
  student: Student;
  sessions: PaginatedData<SessionRow>;
  stats: Stats;
  filters: Record<string, string>;
  enrollmentHistory: EnrollmentHistoryRow[];
  availableYears: number[];
  selectedYear: number;
}

const grupoColors: Record<string, string> = {
  homens: 'bg-indigo-100 text-indigo-700',
  senhoras: 'bg-pink-100 text-pink-700',
  jovens: 'bg-amber-100 text-amber-700',
  criancas: 'bg-teal-100 text-teal-700',
};

const readinessColors: Record<string, string> = {
  no_classroom: 'bg-slate-100 text-slate-500',
  attendance_ready: 'bg-blue-100 text-blue-700',
  self_service_active: 'bg-green-100 text-green-700',
};

function rateColor(rate: number): string {
  if (rate >= 75) return 'text-green-600';
  if (rate >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function AlunoDetalhe({
  student,
  sessions,
  stats,
  filters,
  enrollmentHistory,
  availableYears,
  selectedYear,
}: Props) {
  const basePath = `/admin/utilizadores/${student.id}`;
  const { handleSort, handlePerPage } = useTableNav(basePath, filters);
  const breadcrumbs = [
    { label: 'Dashboard', href: '/admin' },
    { label: 'Utilizadores', href: '/admin/utilizadores' },
    { label: student.name },
  ];

  const handleYearChange = (year: string) => {
    router.get(basePath, { ...filters, year }, { preserveState: true });
  };

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <Head title={`Aluno — ${student.name}`} />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{student.name}</h1>

              {student.grupo_homogeneo && student.grupo_homogeneo_label && (
                <Badge className={grupoColors[student.grupo_homogeneo] ?? 'bg-slate-100 text-slate-700'}>
                  {student.grupo_homogeneo_label}
                </Badge>
              )}

              <Badge className={readinessColors[student.readiness] ?? 'bg-slate-100 text-slate-500'}>
                {student.readiness_label}
              </Badge>
            </div>

            <div className="flex flex-col gap-1 text-sm text-slate-600">
              {student.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  {student.phone}
                </span>
              )}

              {student.alt_contact && (
                <span className="text-slate-500 text-sm pl-5">{student.alt_contact}</span>
              )}

              {student.classroom_id && student.classroom_name && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  <Link href={`/admin/turmas/${student.classroom_id}/alunos`} className="text-blue-600 hover:underline">
                    {student.classroom_name}
                  </Link>
                </span>
              )}
            </div>
          </div>

          <Button asChild variant="outline" className="self-start">
            <Link href="/admin/utilizadores">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>

        {/* Enrollment History */}
        {enrollmentHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                Histórico de Matrículas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {enrollmentHistory.map((row) => (
                  <div key={row.year} className="py-2 flex items-center gap-4">
                    <span className="text-sm font-semibold w-12 text-slate-700">{row.year}</span>
                    <div className="flex-1">
                      {row.entries.map((entry, i) => (
                        <div key={i} className="text-sm text-slate-600 flex items-center gap-2">
                          <span>{entry.classroom_name ?? '—'}</span>
                          {entry.transferred_at && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">transferido {entry.transferred_at}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                    {row.classroom_id && (
                      <Link href={`/admin/turmas/${row.classroom_id}/alunos?year=${row.year}`} className="text-xs text-blue-600 hover:underline">
                        Ver turma
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Year selector + stats */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-700">Presenças</h2>
          {availableYears.length > 1 && (
            <Select value={String(selectedYear)} onValueChange={handleYearChange}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Total Aulas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Presenças</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.attended}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Taxa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className={`text-3xl font-bold ${rateColor(stats.rate)}`}>{stats.rate}%</p>
              <Progress value={stats.rate} className="h-1.5" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Aulas — {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.data.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-500">
                Ainda não há aulas registadas para este ano
              </p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-left text-slate-500">
                        <SortableTh label="Aula" column="title" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                        <SortableTh label="Data" column="session_date" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                        <th className="px-6 py-3 font-medium">Professor</th>
                        <th className="px-6 py-3 font-medium">Presença</th>
                        <th className="px-6 py-3 font-medium">Método</th>
                        <th className="px-6 py-3 font-medium">Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sessions.data.map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-medium">{session.title}</td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {session.session_date}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">{session.teacher_name ?? '—'}</td>
                          <td className="px-6 py-4">
                            {session.attended ? (
                              <Badge className="bg-green-100 text-green-700 flex w-fit items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />Presente
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-700 flex w-fit items-center gap-1">
                                <X className="h-3.5 w-3.5" />Ausente
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {session.method && session.method_label ? (
                              <Badge
                                variant="outline"
                                className={session.method === 'qr' ? 'border-purple-300 text-purple-700' : 'border-slate-300 text-slate-600'}
                              >
                                {session.method === 'qr' ? <QrCode className="mr-1 h-3 w-3" /> : <Hand className="mr-1 h-3 w-3" />}
                                {session.method_label}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600">{session.checked_in_at ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y md:hidden">
                  {sessions.data.map((session) => (
                    <div key={session.id} className="flex items-start justify-between px-4 py-4">
                      <div className="space-y-0.5">
                        <p className="font-medium">{session.title}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{session.session_date}
                        </p>
                      </div>
                      <div>
                        {session.attended ? (
                          <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />Presente
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                            <X className="h-3.5 w-3.5" />Ausente
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <TablePagination
          data={sessions}
          currentPath={basePath}
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>
    </AdminLayout>
  );
}
