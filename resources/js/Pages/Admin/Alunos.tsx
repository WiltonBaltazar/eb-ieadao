import { Head, Link, router } from '@inertiajs/react';
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { Label } from '@/Components/ui/label';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import {
  Search, ArrowRightLeft, Eye, X, Upload, FileSpreadsheet,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';

interface StudentRow {
  id: number;
  name: string;
  phone: string | null;
  classroom_id: number | null;
  classroom_name: string | null;
  grupo_homogeneo: string | null;
  grupo_homogeneo_label: string | null;
  attendance_rate: number;
}

interface Props extends PageProps {
  students: PaginatedData<StudentRow>;
  classrooms: Array<{ id: number; name: string }>;
  gruposOptions: Array<{ value: string; label: string }>;
  filters: Record<string, string>;
}

interface ImportRow {
  nome: string;
  telefone: string;
  grupo_homogeneo: string;
  data_inscricao: string;
  _errors: string[];
}

const VALID_GRUPOS = ['homens', 'senhoras', 'jovens', 'criancas'];

const grupoColors: Record<string, string> = {
  homens:   'bg-indigo-100 text-indigo-700',
  senhoras: 'bg-pink-100 text-pink-700',
  jovens:   'bg-amber-100 text-amber-700',
  criancas: 'bg-teal-100 text-teal-700',
};

function validateRow(raw: Record<string, unknown>): ImportRow {
  const nome           = String(raw['nome'] ?? raw['Nome'] ?? raw['name'] ?? '').trim();
  const telefone       = String(raw['telefone'] ?? raw['Telefone'] ?? raw['phone'] ?? '').trim();
  const grupo          = String(raw['grupo_homogeneo'] ?? raw['Grupo'] ?? raw['grupo'] ?? '').trim().toLowerCase();
  const dataRaw        = raw['data_inscricao'] ?? raw['Data'] ?? raw['data'] ?? '';
  const data_inscricao = String(dataRaw).trim();

  const errors: string[] = [];
  if (!nome)       errors.push('nome em falta');
  if (!telefone)   errors.push('telefone em falta');
  if (!VALID_GRUPOS.includes(grupo)) errors.push(`grupo inválido "${grupo}"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_inscricao)) errors.push('data deve ser YYYY-MM-DD');

  return { nome, telefone, grupo_homogeneo: grupo, data_inscricao, _errors: errors };
}

export default function Alunos({ students, classrooms, gruposOptions, filters }: Props) {
  const [search, setSearch]               = useState(filters.search ?? '');
  const [transferStudent, setTransferStudent] = useState<StudentRow | null>(null);
  const [newClassroomId, setNewClassroomId]   = useState('');
  const [transferring, setTransferring]       = useState(false);
  const { handleSort, handlePerPage } = useTableNav('/admin/alunos', filters);

  // ── Bulk import state ────────────────────────────────────────
  const [showImport, setShowImport]       = useState(false);
  const [isDragging, setIsDragging]       = useState(false);
  const [importRows, setImportRows]       = useState<ImportRow[]>([]);
  const [importClassroom, setImportClassroom] = useState('');
  const [parsing, setParsing]             = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [importResult, setImportResult]   = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidRows  = importRows.filter((r) => r._errors.length > 0);
  const validRows    = importRows.filter((r) => r._errors.length === 0);
  const canSubmit    = validRows.length > 0 && !submitting;

  const parseFile = useCallback((file: File) => {
    setParsing(true);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data   = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb     = XLSX.read(data, { type: 'array', cellDates: true });
        const ws     = wb.Sheets[wb.SheetNames[0]];
        const json   = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
        setImportRows(json.map(validateRow));
      } catch {
        setImportRows([]);
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const handleImportSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/admin/alunos/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          rows: validRows.map(({ _errors: _e, ...r }) => r),
          classroom_id: importClassroom || null,
        }),
      });
      const json = await res.json();
      setImportResult(json);
      if (json.created > 0 || json.updated > 0) {
        // Refresh the table after a short delay so the user can read the result
        setTimeout(() => {
          router.reload({ only: ['students'] });
        }, 1200);
      }
    } catch {
      setImportResult({ created: 0, updated: 0, errors: ['Erro de rede. Tente novamente.'] });
    } finally {
      setSubmitting(false);
    }
  };

  const resetImport = () => {
    setImportRows([]);
    setImportResult(null);
    setImportClassroom('');
  };

  // ── Existing handlers ────────────────────────────────────────
  const handleSearch = () => {
    router.get('/admin/alunos', { ...filters, search }, { preserveState: true });
  };

  const handleFilter = (key: string, value: string) => {
    router.get('/admin/alunos', { ...filters, [key]: value }, { preserveState: true });
  };

  const openTransfer = (student: StudentRow) => {
    setTransferStudent(student);
    setNewClassroomId(student.classroom_id ? String(student.classroom_id) : 'none');
  };

  const handleTransfer = () => {
    if (!transferStudent) return;
    setTransferring(true);
    router.put(
      `/admin/alunos/${transferStudent.id}/transfer`,
      { classroom_id: newClassroomId === 'none' ? null : newClassroomId },
      {
        onSuccess: () => { setTransferStudent(null); setNewClassroomId(''); setTransferring(false); },
        onError:   () => setTransferring(false),
      },
    );
  };

  const hasFilters = !!(filters.search || filters.classroom_id || filters.grupo_homogeneo);
  const clearFilters = () => router.get('/admin/alunos', {}, { preserveState: true });

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Alunos' }]}>
      <Head title="Alunos — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Alunos</h1>
          <Button size="sm" variant="outline" onClick={() => { resetImport(); setShowImport(true); }}>
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 flex-1 min-w-[12rem]">
                <Input
                  placeholder="Pesquisar por nome ou telefone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-8"
                />
                <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={filters.classroom_id ?? 'all'}
                onValueChange={(v) => handleFilter('classroom_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  <SelectItem value="none">Sem turma</SelectItem>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.grupo_homogeneo ?? 'all'}
                onValueChange={(v) => handleFilter('grupo_homogeneo', v === 'all' ? '' : v)}
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
                <Button size="sm" variant="ghost" className="h-8 text-slate-500" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5 mr-1" />Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm admin-table">
                <thead className="border-b border-slate-100">
                  <tr>
                    <SortableTh label="Nome" column="name" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                    <SortableTh label="Contacto" column="phone" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden md:table-cell" />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Turma</th>
                    <SortableTh label="Grupo" column="grupo_homogeneo" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden lg:table-cell" />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Presenças</th>
                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Nenhum aluno encontrado.
                      </td>
                    </tr>
                  ) : students.data.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        {s.classroom_name
                          ? <span className="text-slate-700">{s.classroom_name}</span>
                          : <span className="text-slate-300 text-xs italic">Sem turma</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {s.grupo_homogeneo
                          ? <Badge className={`text-xs ${grupoColors[s.grupo_homogeneo] ?? ''}`}>{s.grupo_homogeneo_label}</Badge>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-semibold tabular-nums ${
                          s.attendance_rate >= 75 ? 'text-green-600' : s.attendance_rate >= 50 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {s.attendance_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-blue-600" onClick={() => openTransfer(s)}>
                            <ArrowRightLeft className="h-3.5 w-3.5" />Transferir
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600">
                            <Link href={`/admin/utilizadores/${s.id}`}>
                              <Eye className="h-3.5 w-3.5" />Ver
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <TablePagination
          data={students}
          currentPath="/admin/alunos"
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>

      {/* Transfer Dialog */}
      <Dialog open={!!transferStudent} onOpenChange={(o) => !o && setTransferStudent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transferir Aluno</DialogTitle>
          </DialogHeader>
          {transferStudent && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-medium">{transferStudent.name}</span>
                {transferStudent.classroom_name && (
                  <> — atualmente em <span className="font-medium">{transferStudent.classroom_name}</span></>
                )}
              </p>
              <div className="space-y-1.5">
                <Label>Nova turma</Label>
                <Select value={newClassroomId} onValueChange={setNewClassroomId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar turma…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem turma</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  onClick={handleTransfer}
                  disabled={transferring || newClassroomId === (transferStudent.classroom_id ? String(transferStudent.classroom_id) : 'none')}
                >
                  {transferring ? 'A transferir…' : 'Confirmar transferência'}
                </Button>
                <Button variant="outline" onClick={() => setTransferStudent(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showImport} onOpenChange={(o) => { if (!o) setShowImport(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar Alunos via Excel / CSV</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Result banner */}
            {importResult && (
              <Alert variant={importResult.errors.length > 0 && importResult.created + importResult.updated === 0 ? 'destructive' : 'default'}
                     className={importResult.created + importResult.updated > 0 ? 'border-green-200 bg-green-50 text-green-800' : ''}>
                {importResult.created + importResult.updated > 0
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>
                  {importResult.created + importResult.updated > 0 && (
                    <span>{importResult.created} criado(s), {importResult.updated} atualizado(s). </span>
                  )}
                  {importResult.errors.length > 0 && (
                    <ul className="mt-1 list-disc list-inside">
                      {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Drop zone — shown before file is loaded */}
            {importRows.length === 0 && !parsing && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-14 cursor-pointer transition-colors
                  ${isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
              >
                <FileSpreadsheet className="h-10 w-10 text-slate-300" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-600">
                    {isDragging ? 'Solte o ficheiro aqui' : 'Arraste um ficheiro .xlsx ou .csv'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">ou clique para selecionar</p>
                </div>
                <div className="text-xs text-slate-400 bg-slate-100 rounded px-3 py-1.5 font-mono">
                  nome · telefone · grupo_homogeneo · data_inscricao
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
              </div>
            )}

            {/* Parsing spinner */}
            {parsing && (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">A processar ficheiro…</span>
              </div>
            )}

            {/* Preview table */}
            {importRows.length > 0 && !parsing && (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">
                      <span className="font-semibold text-green-700">{validRows.length}</span> válidas
                      {invalidRows.length > 0 && (
                        <>, <span className="font-semibold text-red-600">{invalidRows.length}</span> com erros</>
                      )}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-400" onClick={resetImport}>
                    <X className="h-3.5 w-3.5 mr-1" />Limpar
                  </Button>
                </div>

                {/* Classroom selector for enrollment */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm shrink-0">Turma (matrícula)</Label>
                  <Select value={importClassroom || '_none_'} onValueChange={(v) => setImportClassroom(v === '_none_' ? '' : v)}>
                    <SelectTrigger className="h-8 w-56">
                      <SelectValue placeholder="Sem turma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">Sem turma</SelectItem>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">#</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Nome</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Telefone</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Grupo</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Data inscrição</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.map((row, i) => (
                          <tr key={i} className={row._errors.length > 0 ? 'bg-red-50' : ''}>
                            <td className="px-3 py-2 text-slate-400">{i + 2}</td>
                            <td className="px-3 py-2 font-medium">{row.nome || <span className="text-red-400 italic">em falta</span>}</td>
                            <td className="px-3 py-2 font-mono">{row.telefone || <span className="text-red-400 italic">em falta</span>}</td>
                            <td className="px-3 py-2">
                              {VALID_GRUPOS.includes(row.grupo_homogeneo)
                                ? <Badge className={`text-xs ${grupoColors[row.grupo_homogeneo] ?? ''}`}>{row.grupo_homogeneo}</Badge>
                                : <span className="text-red-400 italic">{row.grupo_homogeneo || 'em falta'}</span>}
                            </td>
                            <td className="px-3 py-2 font-mono">{row.data_inscricao || <span className="text-red-400 italic">em falta</span>}</td>
                            <td className="px-3 py-2">
                              {row._errors.length === 0
                                ? <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" />OK</span>
                                : <span className="text-red-500" title={row._errors.join(', ')}>
                                    <AlertCircle className="h-3.5 w-3.5 inline mr-1" />{row._errors.join(', ')}
                                  </span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-3 border-t mt-2">
            {importRows.length > 0 && !importResult && (
              <Button
                className="flex-1"
                onClick={handleImportSubmit}
                disabled={!canSubmit}
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A importar…</>
                  : `Importar ${validRows.length} aluno${validRows.length !== 1 ? 's' : ''}`}
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowImport(false)}>
              {importResult ? 'Fechar' : 'Cancelar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
