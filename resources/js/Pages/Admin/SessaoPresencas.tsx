import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState, useMemo } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Separator } from '@/Components/ui/separator';
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
  X,
  UserPlus,
  CheckCircle2,
  QrCode,
  Hand,
  Zap,
  Users,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';

interface AttendedRow {
  id: number;
  student_id: number;
  name: string;
  phone: string | null;
  role: 'student' | 'teacher';
  grupo_homogeneo: string | null;
  grupo_homogeneo_label: string | null;
  method: 'manual' | 'qr' | 'auto';
  method_label: string;
  checked_in_at: string;
  marked_by: string | null;
}

interface NotAttendedRow {
  id: number;
  name: string;
  phone: string | null;
  role: 'student' | 'teacher';
}

interface Props extends PageProps {
  studySession: {
    id: number;
    title: string;
    session_date: string;
    status: string;
    status_label: string;
    classroom_id: number;
    classroom_name: string;
    teacher_name: string | null;
  };
  attended: PaginatedData<AttendedRow>;
  notAttended: NotAttendedRow[];
  gruposOptions: Array<{ value: string; label: string }>;
  filters: { search?: string; grupo_homogeneo?: string; sort_by?: string; sort_dir?: string; per_page?: string };
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-600',
  draft: 'bg-yellow-100 text-yellow-800',
};

const grupoColors: Record<string, string> = {
  homens: 'bg-indigo-100 text-indigo-700',
  senhoras: 'bg-pink-100 text-pink-700',
  jovens: 'bg-amber-100 text-amber-700',
  criancas: 'bg-teal-100 text-teal-700',
};

export default function SessaoPresencas({
  studySession,
  attended,
  notAttended,
  gruposOptions,
  filters,
}: Props) {
  const { flash, errors } = usePage<PageProps>().props;

  // ── Attended list filters (client-side on the already-filtered server data) ──
  const [tableSearch, setTableSearch] = useState(filters.search ?? '');
  const hasFilters = !!(filters.search || filters.grupo_homogeneo);
  const basePath = `/admin/sessoes/${studySession.id}/presencas`;
  const { handleSort, handlePerPage } = useTableNav(basePath, filters);

  const applyFilter = (key: string, value: string) => {
    router.get(
      `/admin/sessoes/${studySession.id}/presencas`,
      { ...filters, [key]: value || undefined },
      { preserveState: true, preserveScroll: true },
    );
  };

  const clearFilters = () =>
    router.get(`/admin/sessoes/${studySession.id}/presencas`, {}, { preserveState: true });

  // ── Manual mark: search existing students ──
  const [studentSearch, setStudentSearch] = useState('');
  const markForm = useForm({ student_id: '' });

  const matchedStudents = useMemo(() => {
    if (!studentSearch.trim()) return [];
    const q = studentSearch.toLowerCase();
    return notAttended.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? '').includes(q),
    );
  }, [studentSearch, notAttended]);

  const handleMark: FormEventHandler = (e) => {
    e.preventDefault();
    markForm.post(`/admin/sessoes/${studySession.id}/marcar-presente`, {
      onSuccess: () => {
        markForm.reset();
        setStudentSearch('');
      },
    });
  };

  // ── Quick register + mark ──
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const registerForm = useForm({
    name: '',
    phone: studentSearch,
    alt_contact: '',
    grupo_homogeneo: '',
  });

  const handleRegisterAndMark: FormEventHandler = (e) => {
    e.preventDefault();
    registerForm.post(`/admin/sessoes/${studySession.id}/registar-e-marcar`, {
      onSuccess: () => {
        registerForm.reset();
        setStudentSearch('');
        setShowRegisterForm(false);
      },
    });
  };

  // Pre-fill name/phone when opening register form from search
  const openRegisterForm = () => {
    // If search looks like a phone number seed it there, else seed name
    const isPhone = /^\d+$/.test(studentSearch.trim());
    registerForm.setData({
      name: isPhone ? '' : studentSearch,
      phone: isPhone ? studentSearch : '',
      alt_contact: '',
      grupo_homogeneo: '',
    });
    setShowRegisterForm(true);
  };

  const handleRemove = (attendanceId: number, name: string) => {
    if (confirm(`Remover presença de "${name}"?`)) {
      router.delete(`/admin/presencas/${attendanceId}`, {
        preserveScroll: true,
      });
    }
  };

  return (
    <AdminLayout
      breadcrumbs={[
        { label: 'Dashboard', href: '/admin' },
        { label: 'Aulas', href: '/admin/sessoes' },
        { label: studySession.title },
      ]}
    >
      <Head title={`Presenças — ${studySession.title}`} />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-800">{studySession.title}</h1>
              <Badge className={statusColors[studySession.status] ?? ''}>
                {studySession.status_label}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {studySession.classroom_name} · {studySession.session_date}
              {studySession.teacher_name && <> · 👤 {studySession.teacher_name}</>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50">
              <a href={`/admin/sessoes/${studySession.id}/exportar-excel`} download="presencas.xlsx">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/sessoes">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Aulas
              </Link>
            </Button>
          </div>
        </div>

        {/* Flash */}
        {flash?.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>{flash.success}</AlertDescription>
          </Alert>
        )}

        {/* ── Mark Attendance Panel ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hand className="h-4 w-4 text-blue-500" />
              Marcar Presença Manualmente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Student search */}
            <div className="space-y-2">
              <Label>Procurar aluno ou professor pelo nome ou telefone</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-8"
                    placeholder="Nome ou número de telefone…"
                    value={studentSearch}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowRegisterForm(false);
                      markForm.setData('student_id', '');
                    }}
                  />
                </div>
                {studentSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      setStudentSearch('');
                      setShowRegisterForm(false);
                      markForm.setData('student_id', '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Search results */}
              {studentSearch.trim() && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  {matchedStudents.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {matchedStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${markForm.data.student_id === String(s.id)
                              ? 'bg-blue-50 border-l-2 border-blue-500'
                              : ''
                            }`}
                          onClick={() => markForm.setData('student_id', String(s.id))}
                        >
                          <div className="text-left">
                            <span className="font-medium text-slate-800">{s.name}</span>
                            {s.role === 'teacher' && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs ml-2">Professor</Badge>
                            )}
                            {s.phone && (
                              <span className="text-slate-400 ml-2 text-xs">{s.phone}</span>
                            )}
                          </div>
                          {markForm.data.student_id === String(s.id) && (
                            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-slate-500 flex items-center justify-between">
                      <span>Nenhum aluno ou professor encontrado com "{studentSearch}"</span>
                      {!showRegisterForm && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-3 shrink-0 text-xs"
                          onClick={openRegisterForm}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          Registar novo
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mark button */}
            {markForm.data.student_id && (
              <form onSubmit={handleMark}>
                {errors?.mark && (
                  <Alert variant="destructive" className="mb-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errors.mark}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={markForm.processing}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {markForm.processing
                    ? 'A marcar…'
                    : `Confirmar presença de ${notAttended.find((s) => String(s.id) === markForm.data.student_id)?.name ?? ''
                    }`}
                </Button>
              </form>
            )}

            {/* ── Quick register form ── */}
            {showRegisterForm && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-slate-500" />
                    Registar novo aluno e marcar presença
                  </p>

                  {errors?.phone && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{errors.phone}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleRegisterAndMark} className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Nome *</Label>
                        <Input
                          value={registerForm.data.name}
                          onChange={(e) => registerForm.setData('name', e.target.value)}
                          placeholder="Nome completo"
                          className={errors?.name ? 'border-red-500' : ''}
                        />
                        {errors?.name && (
                          <p className="text-xs text-red-600">{errors.name}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label>Telefone / WhatsApp *</Label>
                        <Input
                          type="tel"
                          value={registerForm.data.phone}
                          onChange={(e) => registerForm.setData('phone', e.target.value)}
                          placeholder="912 345 678"
                          className={errors?.phone ? 'border-red-500' : ''}
                        />
                        {errors?.phone && (
                          <p className="text-xs text-red-600">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Grupo Homogéneo *</Label>
                        <Select
                          value={registerForm.data.grupo_homogeneo}
                          onValueChange={(v) => registerForm.setData('grupo_homogeneo', v)}
                        >
                          <SelectTrigger className={errors?.grupo_homogeneo ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Seleciona…" />
                          </SelectTrigger>
                          <SelectContent>
                            {gruposOptions.map((g) => (
                              <SelectItem key={g.value} value={g.value}>
                                {g.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors?.grupo_homogeneo && (
                          <p className="text-xs text-red-600">{errors.grupo_homogeneo}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label>Contacto Alternativo</Label>
                        <Input
                          value={registerForm.data.alt_contact}
                          onChange={(e) => registerForm.setData('alt_contact', e.target.value)}
                          placeholder="Email ou outro número"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      O aluno será adicionado à turma <strong>{studySession.classroom_name}</strong> e a presença ficará marcada.
                    </p>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1" disabled={registerForm.processing}>
                        {registerForm.processing ? 'A registar…' : 'Registar e Marcar Presença'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRegisterForm(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Attended list ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                Presenças Confirmadas
                <Badge className="bg-slate-100 text-slate-700 font-semibold ml-1">
                  {attended.total}
                </Badge>
              </CardTitle>

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                <div className="flex gap-1.5">
                  <Input
                    placeholder="Filtrar…"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilter('search', tableSearch)}
                    className="h-7 w-36 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={() => applyFilter('search', tableSearch)}
                  >
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <Select
                  value={filters.grupo_homogeneo ?? 'all'}
                  onValueChange={(v) => applyFilter('grupo_homogeneo', v === 'all' ? '' : v)}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue placeholder="Grupo" />
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
                    className="h-7 px-2 text-slate-400"
                    onClick={clearFilters}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-0 pb-0">
            {attended.data.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-25" />
                <p className="font-medium">
                  {hasFilters ? 'Nenhum resultado para este filtro' : 'Ainda não há presenças registadas'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/50">
                      <tr>
                        <SortableTh label="Aluno" column="name" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6 py-2.5" />
                        <SortableTh label="Telefone" column="phone" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="py-2.5" />
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500">Grupo</th>
                        <SortableTh label="Método" column="check_in_method" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="py-2.5" />
                        <SortableTh label="Hora" column="checked_in_at" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="py-2.5" />
                        <th className="text-left px-4 py-2.5 font-medium text-slate-500">Por</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attended.data.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/60">
                          <td className="px-6 py-2.5 font-medium text-slate-800">
                            {a.name}
                            {a.role === 'teacher' && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs ml-2">Professor</Badge>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs">{a.phone ?? '—'}</td>
                          <td className="px-4 py-2.5">
                            {a.grupo_homogeneo ? (
                              <Badge className={`text-xs ${grupoColors[a.grupo_homogeneo] ?? ''}`}>
                                {a.grupo_homogeneo_label}
                              </Badge>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={
                                a.method === 'qr'
                                  ? 'border-purple-300 text-purple-700 text-xs'
                                  : a.method === 'auto'
                                  ? 'border-green-300 text-green-700 text-xs'
                                  : 'border-slate-300 text-slate-600 text-xs'
                              }
                            >
                              {a.method === 'qr' ? (
                                <QrCode className="h-3 w-3 mr-1 inline" />
                              ) : a.method === 'auto' ? (
                                <Zap className="h-3 w-3 mr-1 inline" />
                              ) : (
                                <Hand className="h-3 w-3 mr-1 inline" />
                              )}
                              {a.method_label}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">
                            {a.checked_in_at}
                          </td>
                          <td className="px-4 py-2.5 text-slate-400 text-xs">
                            {a.marked_by ?? '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 gap-1 text-xs text-red-500 opacity-60 hover:opacity-100"
                              onClick={() => handleRemove(a.id, a.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />Remover
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden divide-y divide-slate-100">
                  {attended.data.map((a) => (
                    <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-800 truncate">
                          {a.name}
                          {a.role === 'teacher' && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs ml-2">Professor</Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{a.phone}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <Badge
                          variant="outline"
                          className={
                            a.method === 'qr'
                              ? 'border-purple-300 text-purple-700 text-xs'
                              : a.method === 'auto'
                              ? 'border-green-300 text-green-700 text-xs'
                              : 'border-slate-300 text-slate-600 text-xs'
                          }
                        >
                          {a.method_label}
                        </Badge>
                        <span className="text-xs text-slate-400">{a.checked_in_at}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 gap-1 text-xs text-red-500 opacity-60 hover:opacity-100 shrink-0"
                        onClick={() => handleRemove(a.id, a.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />Remover
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <TablePagination
          data={attended}
          currentPath={basePath}
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>
    </AdminLayout>
  );
}
