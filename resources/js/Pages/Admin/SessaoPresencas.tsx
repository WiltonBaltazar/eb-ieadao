import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState, useMemo, useRef } from 'react';
import { useBulkSelect } from '@/hooks/useBulkSelect';
import BulkActionBar from '@/Components/BulkActionBar';
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
  FileText,
  Link2,
  Upload,
  Plus,
  Loader2,
  ClipboardCheck,
} from 'lucide-react';
import { LessonResource, PageProps, PaginatedData } from '@/types';
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
  grupo_homogeneo: string | null;
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
  resources: LessonResource[];
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
  resources,
  gruposOptions,
  filters,
}: Props) {
  const { flash, errors } = usePage<PageProps>().props;

  // ── Attended list filters (client-side on the already-filtered server data) ──
  const [tableSearch, setTableSearch] = useState(filters.search ?? '');
  const hasFilters = !!(filters.search || filters.grupo_homogeneo);
  const basePath = `/admin/sessoes/${studySession.id}/presencas`;
  const { handleSort: baseHandleSort, handlePerPage: baseHandlePerPage } = useTableNav(basePath, filters);
  const { selectedIds, selectedCount, isAllSelected, isIndeterminate, isSelected, toggleOne, toggleAll, clearSelection } = useBulkSelect(attended.data);

  const handleSort = (col: string, dir: string) => { clearSelection(); baseHandleSort(col, dir); };
  const handlePerPage = (n: number) => { clearSelection(); baseHandlePerPage(n); };

  const handleBulkDelete = () => {
    router.post('/admin/presencas/bulk-destroy', { ids: selectedIds }, {
      onSuccess: () => clearSelection(),
    });
  };

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

  // ── Bulk mark presence ──────────────────────────────────────
  const [bulkSearch, setBulkSearch]       = useState('');
  const [markSelected, setMarkSelected]   = useState<Set<number>>(new Set());
  const [bulkMarking, setBulkMarking]     = useState(false);

  const filteredNotAttended = useMemo(() => {
    if (!bulkSearch.trim()) return notAttended;
    const q = bulkSearch.toLowerCase();
    return notAttended.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.phone ?? '').includes(q),
    );
  }, [notAttended, bulkSearch]);

  const markIds            = Array.from(markSelected);
  const markCount          = markSelected.size;
  const isAllMark          = filteredNotAttended.length > 0 && filteredNotAttended.every((s) => markSelected.has(s.id));
  const isIndeterminateMark = markCount > 0 && !isAllMark;
  const isMarked           = (id: number) => markSelected.has(id);

  const toggleMark = (id: number) =>
    setMarkSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAllMark = () =>
    setMarkSelected(
      isAllMark ? new Set() : new Set(filteredNotAttended.map((s) => s.id)),
    );

  const handleBulkMarkPresent = () => {
    if (markIds.length === 0) return;
    setBulkMarking(true);
    router.post(
      `/admin/sessoes/${studySession.id}/bulk-marcar-presente`,
      { student_ids: markIds },
      {
        onSuccess: () => { setMarkSelected(new Set()); setBulkMarking(false); },
        onError:   () => setBulkMarking(false),
      },
    );
  };

  // ── CSV import ──
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile]           = useState<File | null>(null);
  const [importing, setImporting]             = useState(false);
  const [importResult, setImportResult]       = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  const submitImportCsv = () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('xlsx', importFile);
    formData.append('_token', (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '');
    fetch(`/admin/sessoes/${studySession.id}/importar-presencas`, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      body: formData,
    })
      .then((r) => r.json())
      .then((data) => {
        setImportResult(data);
        setImporting(false);
        if (!data.error) router.reload({ only: ['attended', 'notAttended'] });
      })
      .catch(() => setImporting(false));
  };

  // ── Resources ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPdfForm, setShowPdfForm] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfError, setPdfError] = useState('');

  const [showLinkForm, setShowLinkForm] = useState(false);
  const linkForm = useForm({ type: 'link', title: '', url: '' });

  const openPdfForm = () => {
    setPdfFile(null);
    setPdfTitle('');
    setPdfError('');
    setShowPdfForm(true);
    setShowLinkForm(false);
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPdfFile(file);
    setPdfError('');
    if (file && !pdfTitle) setPdfTitle(file.name.replace(/\.pdf$/i, ''));
  };

  const handlePdfSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    if (!pdfFile) return;
    setPdfError('');
    setPdfProgress(0);
    setPdfUploading(true);
    router.post(
      `/admin/sessoes/${studySession.id}/recursos`,
      { type: 'file', title: pdfTitle || pdfFile.name, file: pdfFile },
      {
        forceFormData: true,
        preserveScroll: true,
        onProgress: (progress) => setPdfProgress(progress?.percentage ?? 0),
        onSuccess: () => {
          setShowPdfForm(false);
          setPdfFile(null);
          setPdfTitle('');
          setPdfProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        },
        onError: (errs) => setPdfError(errs.file ?? errs.title ?? 'Erro ao carregar o ficheiro.'),
        onFinish: () => setPdfUploading(false),
      },
    );
  };

  const handleAddLink: FormEventHandler = (e) => {
    e.preventDefault();
    linkForm.post(`/admin/sessoes/${studySession.id}/recursos`, {
      preserveScroll: true,
      onSuccess: () => {
        linkForm.reset();
        setShowLinkForm(false);
      },
    });
  };

  const handleDeleteResource = (resourceId: number, title: string) => {
    if (confirm(`Eliminar recurso "${title}"?`)) {
      router.delete(`/admin/recursos/${resourceId}`, { preserveScroll: true });
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

      {/* ── PDF upload progress overlay ── */}
      {pdfUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl px-8 py-6 w-80 space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {pdfFile?.name ?? 'A carregar…'}
                </p>
                <p className="text-xs text-slate-500">A enviar ficheiro…</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-200"
                  style={{ width: `${pdfProgress}%` }}
                />
              </div>
              <p className="text-right text-xs font-medium text-indigo-600">{pdfProgress}%</p>
            </div>
          </div>
        </div>
      )}

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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              onClick={openImportModal}
            >
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
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
                          placeholder="840000000"
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

        {/* ── Resources Card ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              Recursos da Aula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Existing resources */}
            {resources.length > 0 && (
              <div className="space-y-1">
                {resources.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                    {r.type === 'file'
                      ? <FileText className="h-4 w-4 text-red-400 shrink-0" />
                      : <Link2 className="h-4 w-4 text-blue-400 shrink-0" />
                    }
                    <a
                      href={r.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-slate-700 hover:text-indigo-600 truncate"
                    >
                      {r.title}
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-red-400 hover:text-red-600 shrink-0"
                      onClick={() => handleDeleteResource(r.id, r.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {resources.length === 0 && !showPdfForm && !showLinkForm && (
              <p className="text-sm text-slate-400">Nenhum recurso adicionado.</p>
            )}

            {/* PDF form */}
            {showPdfForm && (
              <form onSubmit={handlePdfSubmit} className="space-y-2 border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5" /> Adicionar PDF
                </p>
                {pdfError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{pdfError}</AlertDescription>
                  </Alert>
                )}
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Título</Label>
                    <Input
                      placeholder="Ex: Slides da aula"
                      value={pdfTitle}
                      onChange={(e) => setPdfTitle(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ficheiro PDF *</Label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={handlePdfFileChange}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs flex-1 justify-start font-normal"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {pdfFile ? pdfFile.name : 'Escolher ficheiro…'}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="text-xs" disabled={!pdfFile || pdfUploading}>
                    {pdfUploading ? 'A carregar…' : 'Carregar PDF'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => { setShowPdfForm(false); setPdfFile(null); setPdfTitle(''); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {/* Link form */}
            {showLinkForm && (
              <form onSubmit={handleAddLink} className="space-y-2 border border-slate-200 rounded-md p-3 bg-slate-50">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Adicionar Link
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Título</Label>
                    <Input
                      placeholder="Ex: Vídeo da aula"
                      value={linkForm.data.title}
                      onChange={(e) => linkForm.setData('title', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">URL *</Label>
                    <Input
                      placeholder="https://…"
                      value={linkForm.data.url}
                      onChange={(e) => linkForm.setData('url', e.target.value)}
                      className={`h-8 text-sm ${linkForm.errors.url ? 'border-red-500' : ''}`}
                    />
                    {linkForm.errors.url && (
                      <p className="text-xs text-red-600">{linkForm.errors.url}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="text-xs" disabled={linkForm.processing}>
                    {linkForm.processing ? 'A guardar…' : 'Guardar'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => { setShowLinkForm(false); linkForm.reset(); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            {/* Action buttons */}
            {!showPdfForm && !showLinkForm && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={openPdfForm}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Adicionar PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5"
                  onClick={() => { setShowLinkForm(true); setShowPdfForm(false); }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Link
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Attended list ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-500" />
                  Presenças
                  <Badge className="bg-slate-100 text-slate-700 font-semibold ml-1">
                    {attended.total}
                  </Badge>
                </CardTitle>
                {markCount > 0 && (
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                    disabled={bulkMarking}
                    onClick={handleBulkMarkPresent}
                  >
                    {bulkMarking
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />A marcar…</>
                      : <><CheckCircle2 className="h-3.5 w-3.5" />Marcar {markCount} presença{markCount !== 1 ? 's' : ''}</>}
                  </Button>
                )}
              </div>

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
            <BulkActionBar
              selectedCount={selectedCount}
              totalOnPage={attended.data.length}
              label="presenças"
              onConfirmDelete={handleBulkDelete}
              onClear={clearSelection}
              onSelectAll={toggleAll}
            />
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm admin-table">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    <th className="w-10 px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <SortableTh label="Aluno" column="name" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6 py-2.5" />
                    <SortableTh label="Telefone" column="phone" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="py-2.5" />
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500">Grupo</th>
                    <SortableTh label="Método" column="check_in_method" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="py-2.5" />
                    <SortableTh label="Hora" column="checked_in_at" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="py-2.5" />
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500">Por</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>

                {/* Attended rows */}
                <tbody className="divide-y divide-slate-50">
                  {attended.data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-25" />
                        <p className="text-sm font-medium">
                          {hasFilters ? 'Nenhum resultado para este filtro' : 'Ainda não há presenças registadas'}
                        </p>
                      </td>
                    </tr>
                  ) : attended.data.map((a) => (
                    <tr key={a.id} className={isSelected(a.id) ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}>
                      <td className="w-10 px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected(a.id)}
                          onChange={() => toggleOne(a.id)}
                          className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
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
                      <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">{a.checked_in_at}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{a.marked_by ?? '—'}</td>
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

                {/* Not-attended rows */}
                {notAttended.length > 0 && (
                  <tbody className="divide-y divide-slate-50">
                    <tr className="border-t-2 border-slate-100 bg-slate-50/70">
                      <td colSpan={8} className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isAllMark}
                            ref={(el) => { if (el) el.indeterminate = isIndeterminateMark; }}
                            onChange={toggleAllMark}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:ring-green-500 cursor-pointer"
                          />
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Não presentes — {notAttended.length}
                          </span>
                          {markCount > 0 && (
                            <span className="text-xs text-green-700 font-medium">
                              {markCount} selecionado{markCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {notAttended.map((s) => (
                      <tr
                        key={s.id}
                        className={`cursor-pointer transition-colors ${isMarked(s.id) ? 'bg-green-50' : 'hover:bg-slate-50/60'}`}
                        onClick={() => toggleMark(s.id)}
                      >
                        <td className="w-10 px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isMarked(s.id)}
                            onChange={() => toggleMark(s.id)}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:ring-green-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-2.5 font-medium text-slate-400">
                          {s.name}
                          {s.role === 'teacher' && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs ml-2 opacity-60">Professor</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 text-xs">{s.phone ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {s.grupo_homogeneo
                            ? <Badge className={`text-xs opacity-50 ${grupoColors[s.grupo_homogeneo] ?? ''}`}>{s.grupo_homogeneo}</Badge>
                            : <span className="text-slate-200 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-200 text-xs">—</td>
                        <td className="px-4 py-2.5 text-slate-200 text-xs">—</td>
                        <td className="px-4 py-2.5 text-slate-200 text-xs">—</td>
                        <td className="px-4 py-2.5"></td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {attended.data.length === 0 && notAttended.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-25" />
                  <p className="font-medium text-sm">Ainda não há presenças registadas</p>
                </div>
              )}
              {attended.data.map((a) => (
                <div key={a.id} className={`px-4 py-3 flex items-center gap-3 ${isSelected(a.id) ? 'bg-blue-50/40' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected(a.id)}
                    onChange={() => toggleOne(a.id)}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer shrink-0"
                  />
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
              {notAttended.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-slate-50 border-t-2 border-slate-100 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isAllMark}
                      ref={(el) => { if (el) el.indeterminate = isIndeterminateMark; }}
                      onChange={toggleAllMark}
                      className="rounded border-gray-300 text-green-600 shadow-sm focus:ring-green-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Não presentes — {notAttended.length}
                    </span>
                  </div>
                  {notAttended.map((s) => (
                    <div
                      key={s.id}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer ${isMarked(s.id) ? 'bg-green-50' : ''}`}
                      onClick={() => toggleMark(s.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isMarked(s.id)}
                        onChange={() => toggleMark(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-green-600 shadow-sm focus:ring-green-500 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-400 truncate">{s.name}</p>
                        <p className="text-xs text-slate-300">{s.phone ?? '—'}</p>
                      </div>
                      <Badge variant="outline" className="border-slate-200 text-slate-300 text-xs shrink-0">Ausente</Badge>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Sticky submit bar */}
            {markCount > 0 && (
              <div className="sticky bottom-0 flex items-center justify-between gap-3 px-4 py-3 border-t border-green-100 bg-green-50">
                <span className="text-sm text-green-800 font-medium">
                  {markCount} aluno{markCount !== 1 ? 's' : ''} · {studySession.session_date}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-green-700" onClick={() => setMarkSelected(new Set())}>
                    Limpar
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    disabled={bulkMarking}
                    onClick={handleBulkMarkPresent}
                  >
                    {bulkMarking
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />A marcar…</>
                      : <><CheckCircle2 className="h-3.5 w-3.5" />Submeter presenças</>}
                  </Button>
                </div>
              </div>
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

      {/* ── CSV Import Modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-500" />
                Importar presenças via CSV
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">Colunas obrigatórias:</p>
              <code className="block text-indigo-700">name · phone · grupo_homogeneo (opcional)</code>
              <p>O aluno é encontrado pelo telefone ou criado se não existir. A matrícula é criada/actualizada automaticamente.</p>
              <a
                href={`/admin/sessoes/${studySession.id}/template-presencas`}
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline mt-1"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Descarregar template .xlsx
              </a>
            </div>

            {importResult ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{importResult.imported}</p>
                    <p className="text-xs text-green-600">importadas</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-600">{importResult.skipped}</p>
                    <p className="text-xs text-slate-500">já existiam</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
                    <p className="text-xs font-medium text-red-700">Erros:</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-red-600">{err}</p>
                    ))}
                  </div>
                )}
                <Button className="w-full" onClick={() => setShowImportModal(false)}>Fechar</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm mb-1.5 block">Ficheiro CSV</Label>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    disabled={!importFile || importing}
                    onClick={submitImportCsv}
                  >
                    {importing
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />A importar…</>
                      : <><Upload className="h-4 w-4 mr-1.5" />Importar</>
                    }
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
